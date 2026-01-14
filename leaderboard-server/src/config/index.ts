import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.intra.42.fr',
  clientId: process.env.FT_CLIENT_ID || '',
  clientSecret: process.env.FT_CLIENT_SECRET || '',
  port: Number(process.env.LEADERBOARD_PORT || 4242),
  dbPath: process.env.LEADERBOARD_DB_PATH || path.resolve(__dirname, '..', '..', 'data', 'leaderboard.db'),
  syncIntervalMinutes: Number(process.env.LEADERBOARD_SYNC_INTERVAL_MINUTES || 720),
  cursusId: Number(process.env.FT_CURSUS_ID || 21),
  campusIds: (process.env.LEADERBOARD_CAMPUS_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0),
  syncToken: process.env.LEADERBOARD_SYNC_TOKEN || '',
  syncCoalitions: process.env.LEADERBOARD_SYNC_COALITIONS === '1',
  syncLogtime: process.env.LEADERBOARD_SYNC_LOGTIME === '1',
  minLevel: Number(process.env.LEADERBOARD_MIN_LEVEL ?? 0),
  maxLevel: Number(process.env.LEADERBOARD_MAX_LEVEL ?? 30),
  excludeLogins: (process.env.LEADERBOARD_EXCLUDE_LOGINS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0),
};
