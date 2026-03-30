import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const normalizeEnv = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCsvIds = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0)
    .map((entry: string) => Number(entry))
    .filter((entry: number) => Number.isFinite(entry) && entry > 0);

const parseCsvStrings = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter((entry: string) => entry.length > 0);

export const config = {
  apiBaseUrl: normalizeEnv(process.env.API_BASE_URL) || 'https://api.intra.42.fr',
  clientId: normalizeEnv(process.env.FT_CLIENT_ID),
  clientSecret: normalizeEnv(process.env.FT_CLIENT_SECRET),
  port: parseNumber(process.env.PORT || process.env.LEADERBOARD_PORT, 4242),
  dbPath: normalizeEnv(process.env.LEADERBOARD_DB_PATH) || path.resolve(__dirname, '..', '..', 'data', 'leaderboard.db'),
  syncIntervalMinutes: parseNumber(process.env.LEADERBOARD_SYNC_INTERVAL_MINUTES, 720),
  cursusId: parseNumber(process.env.FT_CURSUS_ID, 21),
  campusIds: parseCsvIds(process.env.LEADERBOARD_CAMPUS_IDS),
  syncToken: normalizeEnv(process.env.LEADERBOARD_SYNC_TOKEN),
  syncCoalitions: process.env.LEADERBOARD_SYNC_COALITIONS === '1',
  syncLogtime: process.env.LEADERBOARD_SYNC_LOGTIME === '1',
  minLevel: parseNumber(process.env.LEADERBOARD_MIN_LEVEL, 0),
  maxLevel: parseNumber(process.env.LEADERBOARD_MAX_LEVEL, 30),
  excludeLogins: parseCsvStrings(process.env.LEADERBOARD_EXCLUDE_LOGINS),
  hasOauthCredentials: Boolean(normalizeEnv(process.env.FT_CLIENT_ID) && normalizeEnv(process.env.FT_CLIENT_SECRET)),
};
