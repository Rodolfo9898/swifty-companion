import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { config } from './config.js';

let db;

function ensureDir(filePath) {
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
  `);
  if (existingColumns) {
    const columns = db.prepare('PRAGMA table_info(users)').all().map((col) => col.name);
    const addColumn = (name, definition) => {
      if (!columns.includes(name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
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
  `);
  return db;
}

export function upsertCampus(campus) {
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

export function upsertUser(user) {
  const database = getDb();
  const stmt = database.prepare(`
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
    ON CONFLICT(id) DO UPDATE SET
      login = excluded.login,
      displayname = excluded.displayname,
      title = excluded.title,
      image_url = excluded.image_url,
      campus_id = excluded.campus_id,
      campus_name = excluded.campus_name,
      level = excluded.level,
      weekly_logtime = excluded.weekly_logtime,
      correction_points = excluded.correction_points,
      wallets = excluded.wallets,
      blackholed_at = excluded.blackholed_at,
      coalition_name = excluded.coalition_name,
      begin_at = excluded.begin_at,
      promo = excluded.promo,
      updated_at = excluded.updated_at
  `);
  stmt.run(user);
}
