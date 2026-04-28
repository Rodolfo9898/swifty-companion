const CACHE_PREFIX = 'rncp-cache:';

const EVENT_CACHE = `${CACHE_PREFIX}events`;
const GROUP_CACHE = `${CACHE_PREFIX}group-projects`;
const META_CACHE = `${CACHE_PREFIX}meta`;
const CALCULATOR_CACHE = `${CACHE_PREFIX}calculator-roadmaps`;
const PLANNER_CACHE = `${CACHE_PREFIX}planner`;
const LEADERBOARD_CACHE = `${CACHE_PREFIX}leaderboard`;
const LEADERBOARD_RANKING_CACHE = `${CACHE_PREFIX}leaderboard-ranking`;
const LOCAL_SETTINGS_CACHE = `${CACHE_PREFIX}local-settings`;
const LOCAL_LEADERBOARD_SNAPSHOT_CACHE = `${CACHE_PREFIX}leaderboard-snapshot`;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CacheMeta {
  eventsUpdatedAt?: number;
  groupUpdatedAt?: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const content = globalThis.localStorage?.getItem(key);
    if (!content) return fallback;
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, data: unknown) {
  globalThis.localStorage?.setItem(key, JSON.stringify(data));
}

export async function readCacheMeta(): Promise<CacheMeta> {
  return readJson<CacheMeta>(META_CACHE, {});
}

export async function writeCacheMeta(meta: CacheMeta) {
  writeJson(META_CACHE, meta);
}

export async function readEventsCache<T>() {
  return readJson<T | null>(EVENT_CACHE, null);
}

export async function writeEventsCache(data: unknown) {
  writeJson(EVENT_CACHE, data);
}

export async function readGroupCache<T>() {
  return readJson<T | null>(GROUP_CACHE, null);
}

export async function writeGroupCache(data: unknown) {
  writeJson(GROUP_CACHE, data);
}

export async function isCacheFresh(kind: 'events' | 'group') {
  const meta = await readCacheMeta();
  const updatedAt = kind === 'events' ? meta.eventsUpdatedAt : meta.groupUpdatedAt;
  if (!updatedAt) return false;
  return Date.now() - updatedAt < DAY_MS;
}

export async function readCalculatorRoadmaps<T>() {
  return readJson<T>(CALCULATOR_CACHE, [] as T);
}

export async function writeCalculatorRoadmaps(data: unknown) {
  writeJson(CALCULATOR_CACHE, data);
}

export async function readPlannerCache<T>() {
  return readJson<T | null>(PLANNER_CACHE, null);
}

export async function writePlannerCache(data: unknown) {
  writeJson(PLANNER_CACHE, data);
}

export async function readLeaderboardCache<T>() {
  return readJson<T>(LEADERBOARD_CACHE, {} as T);
}

export async function writeLeaderboardCache(data: unknown) {
  writeJson(LEADERBOARD_CACHE, data);
}

export async function readLeaderboardRanking<T>() {
  return readJson<T>(LEADERBOARD_RANKING_CACHE, {} as T);
}

export async function writeLeaderboardRanking(data: unknown) {
  writeJson(LEADERBOARD_RANKING_CACHE, data);
}

export async function readLocalSettingsCache<T>() {
  return readJson<T>(LOCAL_SETTINGS_CACHE, {} as T);
}

export async function writeLocalSettingsCache(data: unknown) {
  writeJson(LOCAL_SETTINGS_CACHE, data);
}

export async function readLocalLeaderboardSnapshotCache<T>() {
  return readJson<T | null>(LOCAL_LEADERBOARD_SNAPSHOT_CACHE, null);
}

export async function writeLocalLeaderboardSnapshotCache(data: unknown) {
  writeJson(LOCAL_LEADERBOARD_SNAPSHOT_CACHE, data);
}

export function getCachePaths() {
  return {
    dir: CACHE_PREFIX,
    events: EVENT_CACHE,
    group: GROUP_CACHE,
    calculator: CALCULATOR_CACHE,
    planner: PLANNER_CACHE,
    leaderboard: LEADERBOARD_CACHE,
    leaderboardRanking: LEADERBOARD_RANKING_CACHE,
    localSettings: LOCAL_SETTINGS_CACHE,
    localLeaderboardSnapshot: LOCAL_LEADERBOARD_SNAPSHOT_CACHE,
    meta: META_CACHE,
  };
}
