import fs from 'node:fs';
import path from 'node:path';

import { config } from '../config/index.js';
import { getDb } from '../db/index.js';

type CampusRow = {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
};

type UserRow = {
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

function resolveOutputPath() {
  const outArgIndex = process.argv.findIndex((entry) => entry === '--out');
  if (outArgIndex >= 0 && process.argv[outArgIndex + 1]) {
    return path.resolve(process.argv[outArgIndex + 1]);
  }
  return path.resolve(process.cwd(), '..', 'src', 'frontend', 'data', 'leaderboard_snapshot.json');
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const db = getDb();
  const outputPath = resolveOutputPath();
  const generatedAtMs = Date.now();

  const campuses = db
    .prepare('SELECT id, name, city, country FROM campuses ORDER BY name ASC')
    .all() as CampusRow[];

  const users = db
    .prepare(`
      SELECT
        id,
        login,
        displayname,
        title,
        image_url as image,
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
      WHERE level IS NOT NULL
      ORDER BY level DESC, login ASC
    `)
    .all() as UserRow[];

  const lastUserUpdateRow = db
    .prepare('SELECT MAX(updated_at) as updatedAt FROM users')
    .get() as { updatedAt?: number | null };

  const snapshot = {
    version: 1,
    generatedAt: new Date(generatedAtMs).toISOString(),
    generatedAtMs,
    source: 'leaderboard-server-export',
    config: {
      minLevel: config.minLevel,
      maxLevel: config.maxLevel,
      excludeLogins: config.excludeLogins,
    },
    campuses,
    users,
    meta: {
      users: users.length,
      campuses: campuses.length,
      lastUserUpdate: lastUserUpdateRow.updatedAt ?? null,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(snapshot), 'utf8');
  process.stdout.write(
    `Snapshot exported: ${outputPath}\nCampuses: ${snapshot.meta.campuses}\nUsers: ${snapshot.meta.users}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
