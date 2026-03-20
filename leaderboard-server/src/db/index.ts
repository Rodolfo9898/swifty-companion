import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { config } from '../config/index.js';

let db: Database.Database | undefined;

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (db) return db;
  ensureDir(config.dbPath);
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  const existingColumns = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();

  db.exec(`
    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      country TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      displayname TEXT,
      title TEXT,
      image_url TEXT,
      campus_id INTEGER,
      campus_name TEXT,
      level REAL,
      weekly_logtime INTEGER,
      correction_points INTEGER,
      wallets INTEGER,
      blackholed_at TEXT,
      coalition_name TEXT,
      begin_at TEXT,
      promo TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_cursus (
      user_id INTEGER NOT NULL,
      login TEXT NOT NULL,
      cursus_id INTEGER,
      cursus_slug TEXT,
      cursus_name TEXT,
      level REAL,
      begin_at TEXT,
      blackholed_at TEXT,
      promo TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
  if (existingColumns) {
    const columns = (db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map((col) => col.name);
    const addColumn = (name: string, definition: string) => {
      if (!columns.includes(name)) {
        db!.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
      }
    };
    addColumn('title', 'TEXT');
    addColumn('campus_name', 'TEXT');
    addColumn('weekly_logtime', 'INTEGER');
    addColumn('correction_points', 'INTEGER');
    addColumn('wallets', 'INTEGER');
    addColumn('blackholed_at', 'TEXT');
    addColumn('coalition_name', 'TEXT');
    addColumn('begin_at', 'TEXT');
    addColumn('promo', 'TEXT');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_campus ON users(campus_id);
    CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
    CREATE INDEX IF NOT EXISTS idx_users_promo ON users(promo);
    CREATE INDEX IF NOT EXISTS idx_user_cursus_user ON user_cursus(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_cursus_login ON user_cursus(login);
    CREATE INDEX IF NOT EXISTS idx_user_cursus_cursus ON user_cursus(cursus_id);
  `);
  return db;
}

export function upsertCampus(campus: { id: number; name: string; city?: string | null; country?: string | null; updated_at: number }) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO campuses (id, name, city, country, updated_at)
    VALUES (@id, @name, @city, @country, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      city = excluded.city,
      country = excluded.country,
      updated_at = excluded.updated_at
  `);
  stmt.run(campus);
}

export function upsertUser(user: {
  id: number;
  login: string;
  displayname?: string | null;
  title?: string | null;
  image_url?: string | null;
  campus_id?: number | null;
  campus_name?: string | null;
  level?: number | null;
  weekly_logtime?: number | null;
  correction_points?: number | null;
  wallets?: number | null;
  blackholed_at?: string | null;
  coalition_name?: string | null;
  begin_at?: string | null;
  promo?: string | null;
  updated_at: number;
}) {
  const database = getDb();
  const updateByIdStmt = database.prepare(`
    UPDATE users SET
      login = @login,
      displayname = @displayname,
      title = @title,
      image_url = @image_url,
      campus_id = @campus_id,
      campus_name = @campus_name,
      level = @level,
      weekly_logtime = @weekly_logtime,
      correction_points = @correction_points,
      wallets = @wallets,
      blackholed_at = @blackholed_at,
      coalition_name = @coalition_name,
      begin_at = @begin_at,
      promo = @promo,
      updated_at = @updated_at
    WHERE id = @id
  `);
  const updateByLoginStmt = database.prepare(`
    UPDATE users SET
      id = @id,
      displayname = @displayname,
      title = @title,
      image_url = @image_url,
      campus_id = @campus_id,
      campus_name = @campus_name,
      level = @level,
      weekly_logtime = @weekly_logtime,
      correction_points = @correction_points,
      wallets = @wallets,
      blackholed_at = @blackholed_at,
      coalition_name = @coalition_name,
      begin_at = @begin_at,
      promo = @promo,
      updated_at = @updated_at
    WHERE login = @login
  `);
  const insertStmt = database.prepare(`
    INSERT INTO users (
      id, login, displayname, title, image_url, campus_id, campus_name,
      level, weekly_logtime, correction_points, wallets, blackholed_at,
      coalition_name, begin_at, promo, updated_at
    )
    VALUES (
      @id, @login, @displayname, @title, @image_url, @campus_id, @campus_name,
      @level, @weekly_logtime, @correction_points, @wallets, @blackholed_at,
      @coalition_name, @begin_at, @promo, @updated_at
    )
  `);
  const tx = database.transaction(() => {
    const byId = updateByIdStmt.run(user);
    if (byId.changes > 0) return;
    const byLogin = updateByLoginStmt.run(user);
    if (byLogin.changes > 0) return;
    insertStmt.run(user);
  });
  tx();
}

export function replaceUserCursus(
  userId: number,
  login: string,
  rows: Array<{
    cursus_id?: number | null;
    cursus_slug?: string | null;
    cursus_name?: string | null;
    level?: number | null;
    begin_at?: string | null;
    blackholed_at?: string | null;
    promo?: string | null;
    is_primary?: boolean;
    updated_at: number;
  }>,
) {
  const database = getDb();
  const deleteStmt = database.prepare('DELETE FROM user_cursus WHERE user_id = ?');
  const insertStmt = database.prepare(`
    INSERT INTO user_cursus (
      user_id, login, cursus_id, cursus_slug, cursus_name, level, begin_at,
      blackholed_at, promo, is_primary, updated_at
    ) VALUES (
      @user_id, @login, @cursus_id, @cursus_slug, @cursus_name, @level, @begin_at,
      @blackholed_at, @promo, @is_primary, @updated_at
    )
  `);

  const tx = database.transaction(() => {
    deleteStmt.run(userId);
    for (const row of rows) {
      insertStmt.run({
        user_id: userId,
        login,
        cursus_id: row.cursus_id ?? null,
        cursus_slug: row.cursus_slug ?? null,
        cursus_name: row.cursus_name ?? null,
        level: row.level ?? null,
        begin_at: row.begin_at ?? null,
        blackholed_at: row.blackholed_at ?? null,
        promo: row.promo ?? null,
        is_primary: row.is_primary ? 1 : 0,
        updated_at: row.updated_at,
      });
    }
  });
  tx();
}
