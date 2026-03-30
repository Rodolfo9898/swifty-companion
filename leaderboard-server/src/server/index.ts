import express from 'express';

import { config } from '../config/index.js';
import { getDb } from '../db/index.js';
import { syncAll } from '../sync/index.js';

const app = express();
const db = getDb();
let syncInProgress = false;

async function runScheduledSync(reason: string, rethrowOnError = false) {
  if (syncInProgress) {
    process.stdout.write(`Sync skipped (${reason}): already running\n`);
    return;
  }
  syncInProgress = true;
  process.stdout.write(`Sync started (${reason})\n`);
  try {
    await syncAll();
    process.stdout.write(`Sync completed (${reason})\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Sync failed (${reason}): ${message}\n`);
    if (rethrowOnError) {
      throw err;
    }
  } finally {
    syncInProgress = false;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/campuses', (req, res) => {
  const rows = db.prepare('SELECT id, name, city, country FROM campuses ORDER BY name ASC').all();
  res.json(rows);
});

app.get('/cursus', (req, res) => {
  const rows = db.prepare(`
    SELECT
      cursus_id as id,
      cursus_slug as slug,
      cursus_name as name,
      COUNT(DISTINCT user_id) as users,
      MAX(updated_at) as updatedAt
    FROM user_cursus
    WHERE cursus_id IS NOT NULL
    GROUP BY cursus_id, cursus_slug, cursus_name
    ORDER BY users DESC, name ASC
  `).all();
  res.json(rows);
});

app.get('/users/:login/cursus', (req, res) => {
  const login = String(req.params.login ?? '').trim().toLowerCase();
  if (!login) {
    res.status(400).json({ error: 'Missing login' });
    return;
  }
  const rows = db.prepare(`
    SELECT
      cursus_id as id,
      cursus_slug as slug,
      cursus_name as name,
      level,
      begin_at as beginAt,
      blackholed_at as blackholedAt,
      promo,
      is_primary as isPrimary,
      updated_at as updatedAt
    FROM user_cursus
    WHERE lower(login) = ?
    ORDER BY is_primary DESC, level DESC, name ASC
  `).all(login);
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
  const rows = (campusId ? stmt.all(campusId) : stmt.all()) as Array<{ promo: string }>;
  res.json(rows.map((row) => row.promo));
});

app.get('/status', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const campuses = db.prepare('SELECT COUNT(*) as count FROM campuses').get() as { count: number };
  const cursusRows = db.prepare('SELECT COUNT(*) as count FROM user_cursus').get() as { count: number };
  const lastUserUpdate = db.prepare('SELECT MAX(updated_at) as updated_at FROM users').get() as {
    updated_at?: number;
  };
  res.json({
    users: users.count,
    campuses: campuses.count,
    userCursusRows: cursusRows.count,
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
    await runScheduledSync('manual', true);
    res.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    res.status(500).json({ error: message });
  }
});

app.listen(config.port, () => {
  process.stdout.write(`Leaderboard API listening on :${config.port}\n`);
  setTimeout(() => {
    void runScheduledSync('startup');
  }, 1500);
  if (config.syncIntervalMinutes > 0) {
    const intervalMs = config.syncIntervalMinutes * 60 * 1000;
    setInterval(() => {
      void runScheduledSync('interval');
    }, intervalMs);
    process.stdout.write(`Sync interval enabled: every ${config.syncIntervalMinutes} minute(s)\n`);
  } else {
    process.stdout.write('Sync interval disabled (LEADERBOARD_SYNC_INTERVAL_MINUTES <= 0)\n');
  }
});
