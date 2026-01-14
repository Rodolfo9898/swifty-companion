import express from 'express';

import { config } from '../config/index.js';
import { getDb } from '../db/index.js';
import { syncAll } from '../sync/index.js';

const app = express();
const db = getDb();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/campuses', (req, res) => {
  const rows = db.prepare('SELECT id, name, city, country FROM campuses ORDER BY name ASC').all();
  res.json(rows);
});

app.get('/leaderboard', (req, res) => {
  const campusId = Number(req.query.campusId ?? 0);
  const promo = String(req.query.promo ?? '');
  const search = String(req.query.search ?? '').trim().toLowerCase();
  const meLogin = String(req.query.meLogin ?? '').trim().toLowerCase();
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const perPage = Math.min(Math.max(Number(req.query.perPage ?? 20), 1), 100);
  const sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
  const sortField = String(req.query.sortField ?? 'level');
  const allowedSort = new Map([
    ['login', 'login'],
    ['displayname', 'displayname'],
    ['level', 'level'],
    ['weekly_logtime', 'weekly_logtime'],
    ['correction_points', 'correction_points'],
    ['wallets', 'wallets'],
    ['campus_name', 'campus_name'],
    ['coalition_name', 'coalition_name'],
    ['blackholed_at', 'blackholed_at'],
  ]);
  const sortColumn = allowedSort.get(sortField) ?? 'level';

  const whereParts = ['level IS NOT NULL'];
  const params: Array<string | number> = [];
  if (Number.isFinite(config.minLevel)) {
    whereParts.push('level >= ?');
    params.push(config.minLevel);
  }
  if (Number.isFinite(config.maxLevel)) {
    whereParts.push('level <= ?');
    params.push(config.maxLevel);
  }
  if (config.excludeLogins.length) {
    const placeholders = config.excludeLogins.map(() => '?').join(', ');
    whereParts.push(`lower(login) NOT IN (${placeholders})`);
    params.push(...config.excludeLogins);
    config.excludeLogins.forEach((value) => {
      whereParts.push('(displayname IS NULL OR lower(displayname) NOT LIKE ?)');
      params.push(`%${value}%`);
    });
  }
  if (campusId) {
    whereParts.push('campus_id = ?');
    params.push(campusId);
  }
  if (promo) {
    whereParts.push('promo = ?');
    params.push(promo);
  }
  if (search) {
    whereParts.push('(lower(login) LIKE ? OR lower(displayname) LIKE ? OR lower(title) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${whereParts.join(' AND ')}`;

  let targetPage = page;
  if (meLogin) {
    const positionStmt = db.prepare(`
      SELECT row_number() OVER (ORDER BY ${sortColumn} ${sortOrder}, login ASC) as pos
      FROM users
      ${where} AND lower(login) = ?
    `);
    const row = positionStmt.get(...params, meLogin) as { pos?: number } | undefined;
    if (row?.pos) {
      targetPage = Math.max(1, Math.floor((row.pos - 1) / perPage) + 1);
    }
  }

  const offset = (targetPage - 1) * perPage;
  const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM users ${where}`);
  const total = (totalStmt.get(...params) as { total: number }).total;

  const stmt = db.prepare(`
    SELECT id, login, displayname, title, image_url as image, campus_id as campusId, campus_name as campusName,
           level, weekly_logtime, correction_points, wallets, blackholed_at, coalition_name, promo
    FROM users
    ${where}
    ORDER BY ${sortColumn} ${sortOrder}, login ASC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(...params, perPage, offset);
  res.json({ data: rows, total, page: targetPage, perPage });
});

app.get('/leaderboard/top', (req, res) => {
  const campusId = Number(req.query.campusId ?? 0);
  const promo = String(req.query.promo ?? '');
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 100);
  const excludeLogin = String(req.query.excludeLogin ?? '').trim().toLowerCase();
  const whereParts = ['level IS NOT NULL'];
  const params: Array<string | number> = [];
  if (Number.isFinite(config.minLevel)) {
    whereParts.push('level >= ?');
    params.push(config.minLevel);
  }
  if (Number.isFinite(config.maxLevel)) {
    whereParts.push('level <= ?');
    params.push(config.maxLevel);
  }
  if (config.excludeLogins.length) {
    const placeholders = config.excludeLogins.map(() => '?').join(', ');
    whereParts.push(`lower(login) NOT IN (${placeholders})`);
    params.push(...config.excludeLogins);
    config.excludeLogins.forEach((value) => {
      whereParts.push('(displayname IS NULL OR lower(displayname) NOT LIKE ?)');
      params.push(`%${value}%`);
    });
  }
  if (campusId) {
    whereParts.push('campus_id = ?');
    params.push(campusId);
  }
  if (promo) {
    whereParts.push('promo = ?');
    params.push(promo);
  }
  if (excludeLogin) {
    whereParts.push('lower(login) != ?');
    params.push(excludeLogin);
  }
  const where = `WHERE ${whereParts.join(' AND ')}`;
  const stmt = db.prepare(`
    SELECT id, login, displayname, title, image_url as image, campus_id as campusId, campus_name as campusName,
           level, weekly_logtime, correction_points, wallets, blackholed_at, coalition_name, promo
    FROM users
    ${where}
    ORDER BY level DESC
    LIMIT ?
  `);
  const rows = stmt.all(...params, limit);
  res.json(rows);
});

app.get('/promos', (req, res) => {
  const campusId = Number(req.query.campusId ?? 0);
  const where = campusId ? 'WHERE campus_id = ? AND promo IS NOT NULL' : 'WHERE promo IS NOT NULL';
  const stmt = db.prepare(`
    SELECT DISTINCT promo FROM users
    ${where}
    ORDER BY promo DESC
  `);
  const rows = campusId ? stmt.all(campusId) : stmt.all();
  res.json(rows.map((row: { promo: string }) => row.promo));
});

app.get('/status', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const campuses = db.prepare('SELECT COUNT(*) as count FROM campuses').get() as { count: number };
  const lastUserUpdate = db.prepare('SELECT MAX(updated_at) as updated_at FROM users').get() as {
    updated_at?: number;
  };
  res.json({
    users: users.count,
    campuses: campuses.count,
    lastUserUpdate: lastUserUpdate.updated_at ?? null,
  });
});

app.post('/sync', async (req, res) => {
  if (config.syncToken) {
    const authHeader = String(req.headers.authorization ?? '');
    if (!authHeader || authHeader !== `Bearer ${config.syncToken}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    await syncAll();
    res.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    res.status(500).json({ error: message });
  }
});

app.listen(config.port, () => {
  process.stdout.write(`Leaderboard API listening on :${config.port}\n`);
});
