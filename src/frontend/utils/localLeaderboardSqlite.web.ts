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

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const SORT_FIELDS: Record<string, keyof SnapshotUser> = {
  login: 'login',
  displayname: 'displayname',
  level: 'level',
  weekly_logtime: 'weekly_logtime',
  correction_points: 'correction_points',
  wallets: 'wallets',
  campus_name: 'campusName',
  coalition_name: 'coalition_name',
  blackholed_at: 'blackholed_at',
};

const bundledSnapshot = require('../data/leaderboard_snapshot.json') as LocalLeaderboardSnapshot;

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

function matchesFilters(
  user: SnapshotUser,
  options: {
    campusId?: number;
    promo?: string;
    search?: string;
    minLevel?: number;
    maxLevel?: number;
    excludeLogins?: string[];
  },
) {
  const level = user.level;
  if (typeof level !== 'number' || !Number.isFinite(level)) return false;
  if (typeof options.minLevel === 'number' && level < options.minLevel) return false;
  if (typeof options.maxLevel === 'number' && level > options.maxLevel) return false;
  if ((options.excludeLogins || []).includes(user.login.toLowerCase())) return false;
  if (options.campusId && user.campusId !== options.campusId) return false;
  if (options.promo && user.promo !== options.promo) return false;

  const search = String(options.search || '').trim().toLowerCase();
  if (!search) return true;
  return [user.login, user.displayname, user.title]
    .filter(Boolean)
    .some((entry) => String(entry).toLowerCase().includes(search));
}

function compareValues(a: SnapshotUser, b: SnapshotUser, field: keyof SnapshotUser, direction: 'asc' | 'desc') {
  const av = a[field];
  const bv = b[field];
  const emptyA = av === null || av === undefined;
  const emptyB = bv === null || bv === undefined;
  if (emptyA && emptyB) return a.login.localeCompare(b.login);
  if (emptyA) return 1;
  if (emptyB) return -1;
  const result = typeof av === 'number' && typeof bv === 'number'
    ? av - bv
    : String(av).localeCompare(String(bv));
  const adjusted = direction === 'asc' ? result : -result;
  return adjusted || a.login.localeCompare(b.login);
}

async function getFilteredUsers(params: LeaderboardPageParams | LeaderboardTopParams) {
  const snapshot = await getPreferredSnapshot();
  const config = snapshot.config || {};
  const users = snapshot.users.filter((user) =>
    matchesFilters(user, {
      campusId: params.campusId,
      promo: params.promo,
      search: 'search' in params ? params.search : undefined,
      minLevel: config.minLevel ?? 0,
      maxLevel: config.maxLevel ?? 30,
      excludeLogins: config.excludeLogins ?? [],
    }),
  );
  return { snapshot, users };
}

export async function refreshLocalSqliteLeaderboardFromSnapshot() {
  await getPreferredSnapshot();
}

export async function getLocalSqliteLeaderboardCampuses() {
  const snapshot = await getPreferredSnapshot();
  return [...snapshot.campuses].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalSqliteLeaderboardPage(params: LeaderboardPageParams) {
  const { users } = await getFilteredUsers(params);
  const sortField = SORT_FIELDS[String(params.sortField || 'level')] || 'level';
  const sortDirection = params.sort === 'asc' ? 'asc' : 'desc';
  const sorted = [...users].sort((a, b) => compareValues(a, b, sortField, sortDirection));
  const perPage = Math.min(Math.max(Number(params.perPage || DEFAULT_PER_PAGE), 1), MAX_PER_PAGE);
  let page = Math.max(Number(params.page || 1), 1);

  const meLogin = String(params.meLogin || '').trim().toLowerCase();
  if (meLogin) {
    const position = sorted.findIndex((entry) => entry.login.toLowerCase() === meLogin);
    if (position >= 0) {
      page = Math.max(1, Math.floor(position / perPage) + 1);
    }
  }

  const total = sorted.length;
  const offset = (page - 1) * perPage;
  return {
    data: sorted.slice(offset, offset + perPage),
    total,
    page,
    perPage,
  };
}

export async function getLocalSqliteLeaderboardTop(params: LeaderboardTopParams) {
  const { users } = await getFilteredUsers(params);
  const limit = Math.min(Math.max(Number(params.limit || 10), 1), 100);
  const excludeLogin = String(params.excludeLogin || '').trim().toLowerCase();
  return users
    .filter((entry) => !excludeLogin || entry.login.toLowerCase() !== excludeLogin)
    .sort((a, b) => compareValues(a, b, 'level', 'desc'))
    .slice(0, limit);
}

export async function getLocalSqliteLeaderboardPromos(params: { campusId?: number }) {
  const snapshot = await getPreferredSnapshot();
  const campusId = Number(params.campusId || 0);
  const promos = new Set<string>();
  snapshot.users.forEach((user) => {
    if (campusId && user.campusId !== campusId) return;
    if (user.promo) promos.add(user.promo);
  });
  return [...promos].sort((a, b) => b.localeCompare(a));
}

export async function getLocalSqliteLeaderboardStatus() {
  const snapshot = await getPreferredSnapshot();
  const lastUserUpdate = snapshot.users.reduce<number | null>((latest, user) => {
    if (typeof user.updatedAt !== 'number') return latest;
    if (latest === null) return user.updatedAt;
    return Math.max(latest, user.updatedAt);
  }, null);
  return {
    users: snapshot.users.length,
    campuses: snapshot.campuses.length,
    lastUserUpdate,
    generatedAt: snapshot.generatedAt || null,
    generatedAtMs: Number(snapshot.generatedAtMs || 0),
    version: Number(snapshot.version || 1),
  };
}
