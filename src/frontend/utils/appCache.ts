import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.documentDirectory}rncp-cache/`;
const EVENT_CACHE = `${CACHE_DIR}events.json`;
const GROUP_CACHE = `${CACHE_DIR}group-projects.json`;
const META_CACHE = `${CACHE_DIR}meta.json`;
const CALCULATOR_CACHE = `${CACHE_DIR}calculator-roadmaps.json`;
const PLANNER_CACHE = `${CACHE_DIR}planner.json`;
const LEADERBOARD_CACHE = `${CACHE_DIR}leaderboard.json`;
const LEADERBOARD_RANKING_CACHE = `${CACHE_DIR}leaderboard-ranking.json`;
const LOCAL_SETTINGS_CACHE = `${CACHE_DIR}local-settings.json`;
const LOCAL_LEADERBOARD_SNAPSHOT_CACHE = `${CACHE_DIR}leaderboard-snapshot.json`;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CacheMeta {
  eventsUpdatedAt?: number;
  groupUpdatedAt?: number;
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function readCacheMeta(): Promise<CacheMeta> {
  try {
    const info = await FileSystem.getInfoAsync(META_CACHE);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(META_CACHE);
    return JSON.parse(content) as CacheMeta;
  } catch {
    return {};
  }
}

export async function writeCacheMeta(meta: CacheMeta) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(META_CACHE, JSON.stringify(meta));
}

export async function readEventsCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(EVENT_CACHE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(EVENT_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeEventsCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(EVENT_CACHE, JSON.stringify(data));
}

export async function readGroupCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(GROUP_CACHE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(GROUP_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeGroupCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(GROUP_CACHE, JSON.stringify(data));
}

export async function isCacheFresh(kind: 'events' | 'group') {
  const meta = await readCacheMeta();
  const updatedAt = kind === 'events' ? meta.eventsUpdatedAt : meta.groupUpdatedAt;
  if (!updatedAt) return false;
  return Date.now() - updatedAt < DAY_MS;
}

export async function readCalculatorRoadmaps<T>() {
  try {
    const info = await FileSystem.getInfoAsync(CALCULATOR_CACHE);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(CALCULATOR_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return [];
  }
}

export async function writeCalculatorRoadmaps(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(CALCULATOR_CACHE, JSON.stringify(data));
}

export async function readPlannerCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(PLANNER_CACHE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(PLANNER_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writePlannerCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(PLANNER_CACHE, JSON.stringify(data));
}

export async function readLeaderboardCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(LEADERBOARD_CACHE);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(LEADERBOARD_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return {};
  }
}

export async function writeLeaderboardCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(LEADERBOARD_CACHE, JSON.stringify(data));
}

export async function readLeaderboardRanking<T>() {
  try {
    const info = await FileSystem.getInfoAsync(LEADERBOARD_RANKING_CACHE);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(LEADERBOARD_RANKING_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return {};
  }
}

export async function writeLeaderboardRanking(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(LEADERBOARD_RANKING_CACHE, JSON.stringify(data));
}

export async function readLocalSettingsCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(LOCAL_SETTINGS_CACHE);
    if (!info.exists) return {} as T;
    const content = await FileSystem.readAsStringAsync(LOCAL_SETTINGS_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return {} as T;
  }
}

export async function writeLocalSettingsCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(LOCAL_SETTINGS_CACHE, JSON.stringify(data));
}

export async function readLocalLeaderboardSnapshotCache<T>() {
  try {
    const info = await FileSystem.getInfoAsync(LOCAL_LEADERBOARD_SNAPSHOT_CACHE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(LOCAL_LEADERBOARD_SNAPSHOT_CACHE);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeLocalLeaderboardSnapshotCache(data: unknown) {
  await ensureCacheDir();
  await FileSystem.writeAsStringAsync(LOCAL_LEADERBOARD_SNAPSHOT_CACHE, JSON.stringify(data));
}

export function getCachePaths() {
  return {
    dir: CACHE_DIR,
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
