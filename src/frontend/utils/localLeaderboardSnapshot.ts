import {
  readLocalLeaderboardSnapshotCache,
  writeLocalLeaderboardSnapshotCache,
} from './appCache';

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

export type LocalLeaderboardSnapshot = {
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

export type LocalLeaderboardPageParams = {
  campusId?: number;
  promo?: string;
  search?: string;
  sortField?: string;
  page?: number;
  perPage?: number;
  sort?: 'asc' | 'desc';
  meLogin?: string;
};

export type LocalLeaderboardTopParams = {
  campusId?: number;
  promo?: string;
  limit?: number;
  excludeLogin?: string;
};

const bundledSnapshot = require('../data/leaderboard_snapshot.json') as LocalLeaderboardSnapshot;
const DEFAULT_SORT_FIELD = 'level';
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

let inMemorySnapshot: LocalLeaderboardSnapshot | null = null;

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeSnapshot(raw: LocalLeaderboardSnapshot | null | undefined): LocalLeaderboardSnapshot {
  const fallbackGeneratedAt = new Date().toISOString();
  return {
    version: toNumber(raw?.version, 1),
    generatedAt: raw?.generatedAt || fallbackGeneratedAt,
    generatedAtMs: toNumber(raw?.generatedAtMs, Date.now()),
    source: raw?.source || 'bundled',
    config: {
      minLevel: raw?.config?.minLevel,
      maxLevel: raw?.config?.maxLevel,
      excludeLogins: (raw?.config?.excludeLogins || []).map((entry) => entry.toLowerCase()),
    },
    campuses: Array.isArray(raw?.campuses) ? raw!.campuses : [],
    users: Array.isArray(raw?.users) ? raw!.users : [],
    meta: {
      users: toNumber(raw?.meta?.users, Array.isArray(raw?.users) ? raw!.users.length : 0),
      campuses: toNumber(raw?.meta?.campuses, Array.isArray(raw?.campuses) ? raw!.campuses.length : 0),
      lastUserUpdate:
        raw?.meta?.lastUserUpdate === null || typeof raw?.meta?.lastUserUpdate === 'number'
          ? raw.meta.lastUserUpdate
          : null,
    },
  };
}

function getSortValue(user: SnapshotUser, field: string) {
  switch (field) {
    case 'login':
      return user.login.toLowerCase();
    case 'displayname':
      return String(user.displayname || '').toLowerCase();
    case 'weekly_logtime':
      return toNumber(user.weekly_logtime, -1);
    case 'correction_points':
      return toNumber(user.correction_points, -1);
    case 'wallets':
      return toNumber(user.wallets, -1);
    case 'campus_name':
      return String(user.campusName || '').toLowerCase();
    case 'coalition_name':
      return String(user.coalition_name || '').toLowerCase();
    case 'blackholed_at':
      return String(user.blackholed_at || '');
    case 'level':
    default:
      return toNumber(user.level, -1);
  }
}

function compareUsers(a: SnapshotUser, b: SnapshotUser, field: string, sort: 'asc' | 'desc') {
  const direction = sort === 'asc' ? 1 : -1;
  const av = getSortValue(a, field);
  const bv = getSortValue(b, field);
  if (av < bv) return -1 * direction;
  if (av > bv) return 1 * direction;
  return a.login.localeCompare(b.login);
}

function applyFilters(snapshot: LocalLeaderboardSnapshot, params: LocalLeaderboardPageParams | LocalLeaderboardTopParams) {
  const search = String((params as LocalLeaderboardPageParams).search || '')
    .trim()
    .toLowerCase();
  const campusId = Number((params.campusId as number) || 0);
  const promo = String((params.promo as string) || '').trim();
  const minLevel = snapshot.config?.minLevel;
  const maxLevel = snapshot.config?.maxLevel;
  const excludeSet = new Set((snapshot.config?.excludeLogins || []).map((entry) => entry.toLowerCase()));

  return snapshot.users.filter((user) => {
    const level = typeof user.level === 'number' ? user.level : null;
    if (level === null) return false;
    if (typeof minLevel === 'number' && level < minLevel) return false;
    if (typeof maxLevel === 'number' && level > maxLevel) return false;
    if (excludeSet.size && excludeSet.has(user.login.toLowerCase())) return false;
    if (campusId && user.campusId !== campusId) return false;
    if (promo && user.promo !== promo) return false;
    if (!search) return true;
    const haystack = `${user.login} ${user.displayname || ''} ${user.title || ''}`.toLowerCase();
    return haystack.includes(search);
  });
}

export async function ensureLocalLeaderboardSnapshotSeeded() {
  if (inMemorySnapshot) return inMemorySnapshot;
  const diskSnapshot = sanitizeSnapshot(
    await readLocalLeaderboardSnapshotCache<LocalLeaderboardSnapshot>(),
  );
  const bundled = sanitizeSnapshot(bundledSnapshot);
  const shouldUseBundled =
    !diskSnapshot.users.length ||
    bundled.version > diskSnapshot.version ||
    bundled.generatedAtMs > diskSnapshot.generatedAtMs;
  if (shouldUseBundled) {
    inMemorySnapshot = bundled;
    await writeLocalLeaderboardSnapshotCache(bundled);
    return bundled;
  }
  inMemorySnapshot = diskSnapshot;
  return diskSnapshot;
}

export async function getLocalLeaderboardStatus() {
  const snapshot = await ensureLocalLeaderboardSnapshotSeeded();
  return {
    users: snapshot.meta?.users ?? snapshot.users.length,
    campuses: snapshot.meta?.campuses ?? snapshot.campuses.length,
    lastUserUpdate: snapshot.meta?.lastUserUpdate ?? null,
    generatedAt: snapshot.generatedAt,
    generatedAtMs: snapshot.generatedAtMs,
    version: snapshot.version,
  };
}

export async function getLocalLeaderboardCampuses() {
  const snapshot = await ensureLocalLeaderboardSnapshotSeeded();
  return [...snapshot.campuses].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalLeaderboardPage(params: LocalLeaderboardPageParams) {
  const snapshot = await ensureLocalLeaderboardSnapshotSeeded();
  const sortField = params.sortField || DEFAULT_SORT_FIELD;
  const sort = params.sort === 'asc' ? 'asc' : 'desc';
  const perPage = Math.min(Math.max(Number(params.perPage || DEFAULT_PER_PAGE), 1), MAX_PER_PAGE);
  const basePage = Math.max(Number(params.page || 1), 1);

  const filtered = applyFilters(snapshot, params).sort((a, b) => compareUsers(a, b, sortField, sort));
  let page = basePage;
  const meLogin = String(params.meLogin || '').trim().toLowerCase();
  if (meLogin) {
    const index = filtered.findIndex((entry) => entry.login.toLowerCase() === meLogin);
    if (index >= 0) {
      page = Math.floor(index / perPage) + 1;
    }
  }

  const offset = (page - 1) * perPage;
  const data = filtered.slice(offset, offset + perPage);
  return {
    data,
    total: filtered.length,
    page,
    perPage,
  };
}

export async function getLocalLeaderboardTop(params: LocalLeaderboardTopParams) {
  const snapshot = await ensureLocalLeaderboardSnapshotSeeded();
  const excludeLogin = String(params.excludeLogin || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(params.limit || 10), 1), 100);
  return applyFilters(snapshot, params)
    .filter((entry) => (excludeLogin ? entry.login.toLowerCase() !== excludeLogin : true))
    .sort((a, b) => compareUsers(a, b, 'level', 'desc'))
    .slice(0, limit);
}

export async function getLocalLeaderboardPromos(params: { campusId?: number }) {
  const snapshot = await ensureLocalLeaderboardSnapshotSeeded();
  const campusId = Number(params.campusId || 0);
  const promos = new Set<string>();
  snapshot.users.forEach((entry) => {
    if (!entry.promo) return;
    if (campusId && entry.campusId !== campusId) return;
    promos.add(entry.promo);
  });
  return Array.from(promos).sort((a, b) => {
    const [am, ay] = a.split('/');
    const [bm, by] = b.split('/');
    const aYear = Number(ay) || 0;
    const bYear = Number(by) || 0;
    if (aYear !== bYear) return bYear - aYear;
    const aMonth = Number(am) || 0;
    const bMonth = Number(bm) || 0;
    return bMonth - aMonth;
  });
}
