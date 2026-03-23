import * as SQLite from 'expo-sqlite';

import { readLocalLeaderboardSnapshotCache } from './appCache';

type SnapshotCampus = {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
};

type SnapshotUser = {
  id: number;
  login: string;
  displayname?: string | null;
  title?: string | null;
  image?: string | null;
  campusId?: number | null;
  campusName?: string | null;
  level?: number | null;
  weekly_logtime?: number | null;
  correction_points?: number | null;
  wallets?: number | null;
  blackholed_at?: string | null;
  coalition_name?: string | null;
  promo?: string | null;
  updatedAt?: number | null;
};

type LocalLeaderboardSnapshot = {
  version: number;
  generatedAt: string;
  generatedAtMs: number;
  source?: string;
  config?: {
    minLevel?: number;
    maxLevel?: number;
    excludeLogins?: string[];
  };
  campuses: SnapshotCampus[];
  users: SnapshotUser[];
  meta?: {
    users: number;
    campuses: number;
    lastUserUpdate: number | null;
  };
};

type LeaderboardPageParams = {
  campusId?: number;
  promo?: string;
  search?: string;
  sortField?: string;
  page?: number;
  perPage?: number;
  sort?: 'asc' | 'desc';
  meLogin?: string;
};

type LeaderboardTopParams = {
  campusId?: number;
  promo?: string;
  limit?: number;
  excludeLogin?: string;
};

const DB_NAME = 'leaderboard_local.db';
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const SORT_FIELDS: Record<string, string> = {
  login: 'login',
  displayname: 'displayname',
  level: 'level',
  weekly_logtime: 'weekly_logtime',
  correction_points: 'correction_points',
  wallets: 'wallets',
  campus_name: 'campus_name',
  coalition_name: 'coalition_name',
  blackholed_at: 'blackholed_at',
};

const bundledSnapshot = require('../data/leaderboard_snapshot.json') as LocalLeaderboardSnapshot;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

function sanitizeSnapshot(raw: LocalLeaderboardSnapshot | null | undefined): LocalLeaderboardSnapshot {
  const generatedAtMs = toFiniteNumber(raw?.generatedAtMs, 0);
  return {
    version: toFiniteNumber(raw?.version, 1),
    generatedAt: raw?.generatedAt || new Date(generatedAtMs || Date.now()).toISOString(),
    generatedAtMs,
    source: raw?.source || 'unknown',
    config: {
      minLevel: typeof raw?.config?.minLevel === 'number' ? raw.config.minLevel : 0,
      maxLevel: typeof raw?.config?.maxLevel === 'number' ? raw.config.maxLevel : 30,
      excludeLogins: (raw?.config?.excludeLogins || []).map((entry) => entry.toLowerCase()),
    },
    campuses: Array.isArray(raw?.campuses) ? raw.campuses : [],
    users: Array.isArray(raw?.users) ? raw.users : [],
    meta: {
      users: toFiniteNumber(raw?.meta?.users, Array.isArray(raw?.users) ? raw.users.length : 0),
      campuses: toFiniteNumber(raw?.meta?.campuses, Array.isArray(raw?.campuses) ? raw.campuses.length : 0),
      lastUserUpdate:
        raw?.meta?.lastUserUpdate === null || typeof raw?.meta?.lastUserUpdate === 'number'
          ? raw.meta.lastUserUpdate
          : null,
    },
  };
}

async function getPreferredSnapshot() {
  const cached = sanitizeSnapshot(
    await readLocalLeaderboardSnapshotCache<LocalLeaderboardSnapshot>(),
  );
  const bundled = sanitizeSnapshot(bundledSnapshot);
  if (!cached.users.length) return bundled;
  if (cached.generatedAtMs > bundled.generatedAtMs) return cached;
  if (cached.version > bundled.version) return cached;
  return bundled;
}

async function createSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      country TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      displayname TEXT,
      title TEXT,
      image TEXT,
      campus_id INTEGER,
      campus_name TEXT,
      level REAL,
      weekly_logtime INTEGER,
      correction_points INTEGER,
      wallets INTEGER,
      blackholed_at TEXT,
      coalition_name TEXT,
      promo TEXT,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_users_campus ON users(campus_id);
    CREATE INDEX IF NOT EXISTS idx_users_promo ON users(promo);
    CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
    CREATE INDEX IF NOT EXISTS idx_users_login ON users(login COLLATE NOCASE);
  `);
}

async function seedDb(db: SQLite.SQLiteDatabase, snapshot: LocalLeaderboardSnapshot) {
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    await db.execAsync('DELETE FROM campuses');
    await db.execAsync('DELETE FROM users');
    await db.execAsync("DELETE FROM metadata WHERE key LIKE 'snapshot_%'");

    for (const campus of snapshot.campuses) {
      await db.runAsync(
        'INSERT INTO campuses (id, name, city, country) VALUES (?, ?, ?, ?)',
        [campus.id, campus.name, campus.city ?? null, campus.country ?? null],
      );
    }

    for (const user of snapshot.users) {
      await db.runAsync(
        `INSERT INTO users (
          id, login, displayname, title, image, campus_id, campus_name, level, weekly_logtime,
          correction_points, wallets, blackholed_at, coalition_name, promo, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.login,
          user.displayname ?? null,
          user.title ?? null,
          user.image ?? null,
          user.campusId ?? null,
          user.campusName ?? null,
          user.level ?? null,
          user.weekly_logtime ?? null,
          user.correction_points ?? null,
          user.wallets ?? null,
          user.blackholed_at ?? null,
          user.coalition_name ?? null,
          user.promo ?? null,
          user.updatedAt ?? null,
        ],
      );
    }

    await db.runAsync("INSERT INTO metadata (key, value) VALUES ('snapshot_version', ?)", [
      String(snapshot.version),
    ]);
    await db.runAsync("INSERT INTO metadata (key, value) VALUES ('snapshot_generated_at_ms', ?)", [
      String(snapshot.generatedAtMs),
    ]);
    await db.runAsync("INSERT INTO metadata (key, value) VALUES ('snapshot_generated_at', ?)", [
      snapshot.generatedAt,
    ]);
    await db.runAsync("INSERT INTO metadata (key, value) VALUES ('snapshot_source', ?)", [
      snapshot.source || 'unknown',
    ]);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

async function ensureSeed(db: SQLite.SQLiteDatabase) {
  const snapshot = await getPreferredSnapshot();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = 'snapshot_generated_at_ms'",
  );
  const currentGeneratedAtMs = Number(row?.value || 0);
  const shouldSeed =
    !currentGeneratedAtMs ||
    snapshot.generatedAtMs > currentGeneratedAtMs ||
    !currentGeneratedAtMs;
  if (shouldSeed) {
    await seedDb(db, snapshot);
  }
}

export async function refreshLocalSqliteLeaderboardFromSnapshot() {
  const db = await getDb();
  const snapshot = await getPreferredSnapshot();
  await seedDb(db, snapshot);
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await createSchema(db);
      await ensureSeed(db);
      return db;
    })();
  }
  return dbPromise;
}

function buildWhereClause(options: {
  campusId?: number;
  promo?: string;
  search?: string;
  minLevel?: number;
  maxLevel?: number;
  excludeLogins?: string[];
}) {
  const whereParts = ['level IS NOT NULL'];
  const params: Array<string | number> = [];
  if (typeof options.minLevel === 'number' && Number.isFinite(options.minLevel)) {
    whereParts.push('level >= ?');
    params.push(options.minLevel);
  }
  if (typeof options.maxLevel === 'number' && Number.isFinite(options.maxLevel)) {
    whereParts.push('level <= ?');
    params.push(options.maxLevel);
  }
  const excludeLogins = options.excludeLogins || [];
  if (excludeLogins.length) {
    const placeholders = excludeLogins.map(() => '?').join(', ');
    whereParts.push(`lower(login) NOT IN (${placeholders})`);
    params.push(...excludeLogins.map((entry) => entry.toLowerCase()));
  }
  const campusId = Number(options.campusId || 0);
  if (campusId) {
    whereParts.push('campus_id = ?');
    params.push(campusId);
  }
  if (options.promo) {
    whereParts.push('promo = ?');
    params.push(options.promo);
  }
  const search = String(options.search || '').trim().toLowerCase();
  if (search) {
    whereParts.push('(lower(login) LIKE ? OR lower(displayname) LIKE ? OR lower(title) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return {
    where: `WHERE ${whereParts.join(' AND ')}`,
    params,
  };
}

async function getSnapshotConfig(db: SQLite.SQLiteDatabase) {
  const snapshot = await getPreferredSnapshot();
  return {
    minLevel: snapshot.config?.minLevel ?? 0,
    maxLevel: snapshot.config?.maxLevel ?? 30,
    excludeLogins: snapshot.config?.excludeLogins ?? [],
  };
}

export async function getLocalSqliteLeaderboardCampuses() {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    city?: string | null;
    country?: string | null;
  }>('SELECT id, name, city, country FROM campuses ORDER BY name ASC');
  return rows;
}

export async function getLocalSqliteLeaderboardPage(params: LeaderboardPageParams) {
  const db = await getDb();
  const config = await getSnapshotConfig(db);
  const { where, params: whereParams } = buildWhereClause({
    campusId: params.campusId,
    promo: params.promo,
    search: params.search,
    minLevel: config.minLevel,
    maxLevel: config.maxLevel,
    excludeLogins: config.excludeLogins,
  });
  const sortField = SORT_FIELDS[String(params.sortField || 'level')] || 'level';
  const sortDirection = params.sort === 'asc' ? 'ASC' : 'DESC';
  const perPage = Math.min(Math.max(Number(params.perPage || DEFAULT_PER_PAGE), 1), MAX_PER_PAGE);
  let page = Math.max(Number(params.page || 1), 1);

  const meLogin = String(params.meLogin || '').trim().toLowerCase();
  if (meLogin) {
    const position = await db.getFirstAsync<{ pos: number }>(
      `
      SELECT row_number() OVER (ORDER BY ${sortField} ${sortDirection}, login ASC) as pos
      FROM users
      ${where} AND lower(login) = ?
      `,
      [...whereParams, meLogin],
    );
    if (position?.pos) {
      page = Math.max(1, Math.floor((position.pos - 1) / perPage) + 1);
    }
  }

  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM users ${where}`,
    whereParams,
  );
  const total = Number(totalRow?.total || 0);
  const offset = (page - 1) * perPage;
  const rows = await db.getAllAsync<SnapshotUser>(
    `
    SELECT
      id,
      login,
      displayname,
      title,
      image,
      campus_id as campusId,
      campus_name as campusName,
      level,
      weekly_logtime,
      correction_points,
      wallets,
      blackholed_at,
      coalition_name,
      promo,
      updated_at as updatedAt
    FROM users
    ${where}
    ORDER BY ${sortField} ${sortDirection}, login ASC
    LIMIT ? OFFSET ?
    `,
    [...whereParams, perPage, offset],
  );
  return { data: rows, total, page, perPage };
}

export async function getLocalSqliteLeaderboardTop(params: LeaderboardTopParams) {
  const db = await getDb();
  const config = await getSnapshotConfig(db);
  const { where, params: whereParams } = buildWhereClause({
    campusId: params.campusId,
    promo: params.promo,
    minLevel: config.minLevel,
    maxLevel: config.maxLevel,
    excludeLogins: config.excludeLogins,
  });
  const limit = Math.min(Math.max(Number(params.limit || 10), 1), 100);
  const excludeLogin = String(params.excludeLogin || '').trim().toLowerCase();
  const topWhere = excludeLogin ? `${where} AND lower(login) != ?` : where;
  const rows = await db.getAllAsync<SnapshotUser>(
    `
    SELECT
      id,
      login,
      displayname,
      title,
      image,
      campus_id as campusId,
      campus_name as campusName,
      level,
      weekly_logtime,
      correction_points,
      wallets,
      blackholed_at,
      coalition_name,
      promo,
      updated_at as updatedAt
    FROM users
    ${topWhere}
    ORDER BY level DESC
    LIMIT ?
    `,
    [...whereParams, ...(excludeLogin ? [excludeLogin] : []), limit],
  );
  return rows;
}

export async function getLocalSqliteLeaderboardPromos(params: { campusId?: number }) {
  const db = await getDb();
  const campusId = Number(params.campusId || 0);
  const rows = await db.getAllAsync<{ promo: string }>(
    campusId
      ? 'SELECT DISTINCT promo FROM users WHERE promo IS NOT NULL AND campus_id = ? ORDER BY promo DESC'
      : 'SELECT DISTINCT promo FROM users WHERE promo IS NOT NULL ORDER BY promo DESC',
    campusId ? [campusId] : [],
  );
  return rows.map((row) => row.promo);
}

export async function getLocalSqliteLeaderboardStatus() {
  const db = await getDb();
  const users = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const campuses = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM campuses');
  const lastUserUpdate = await db.getFirstAsync<{ updatedAt: number | null }>(
    'SELECT MAX(updated_at) as updatedAt FROM users',
  );
  const generatedAt = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = 'snapshot_generated_at'",
  );
  const generatedAtMs = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = 'snapshot_generated_at_ms'",
  );
  const version = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = 'snapshot_version'",
  );
  return {
    users: Number(users?.count || 0),
    campuses: Number(campuses?.count || 0),
    lastUserUpdate: lastUserUpdate?.updatedAt ?? null,
    generatedAt: generatedAt?.value || null,
    generatedAtMs: Number(generatedAtMs?.value || 0),
    version: Number(version?.value || 1),
  };
}
