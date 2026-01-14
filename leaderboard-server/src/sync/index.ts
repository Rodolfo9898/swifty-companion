import { config } from '../config/index.js';
import { getDb, upsertCampus, upsertUser } from '../db/index.js';
import {
  fetchCampuses,
  fetchCampusUsers,
  fetchLocations,
  fetchUserCoalitions,
  fetchUserProfile,
} from '../api/fortyTwoClient.js';

type Campus = {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
};

type CursusEntry = {
  level?: number;
  begin_at?: string | null;
  cursus?: { id?: number; slug?: string | null; name?: string | null };
};

type CampusEntry = {
  campus?: { id: number; name: string };
  is_primary?: boolean;
};

type UserProfile = {
  id: number;
  login: string;
  displayname?: string;
  title?: string | null;
  image?: { versions?: { small?: string | null }; link?: string | null };
  correction_point?: number | null;
  wallet?: number | null;
  cursus_users?: CursusEntry[];
  campus_users?: CampusEntry[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function find42CursusEntry(user: UserProfile) {
  const cursusUsers = user.cursus_users || [];
  return (
    cursusUsers.find((entry) => {
      if (config.cursusId && entry.cursus?.id === config.cursusId) return true;
      const slug = entry.cursus?.slug?.toLowerCase() || '';
      const name = entry.cursus?.name?.toLowerCase() || '';
      return slug.includes('42cursus') || name.includes('42cursus');
    }) || null
  );
}

function extract42CursusLevel(user: UserProfile) {
  const match = find42CursusEntry(user);
  if (!match || typeof match.level !== 'number') {
    return null;
  }
  return match.level;
}

function formatPromo(beginAt?: string | null) {
  if (!beginAt) return null;
  const date = new Date(beginAt);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${month}/${date.getUTCFullYear()}`;
}

function pickPrimaryCampus(user: UserProfile, fallback: Campus) {
  const campusUsers = user.campus_users || [];
  const primary = campusUsers.find((entry) => entry.is_primary);
  return primary?.campus || campusUsers[0]?.campus || fallback;
}

async function resolveCoalition(userId: number) {
  if (!config.syncCoalitions) return null;
  try {
    const { data } = await fetchUserCoalitions(userId);
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0]?.name || null;
  } catch {
    return null;
  }
}

async function syncWeeklyLogtime(db: ReturnType<typeof getDb>) {
  if (!config.syncLogtime) return;
  process.stdout.write('Sync: weekly logtime\n');
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - (dayOfWeek - 1));
  const sunday = new Date(monday.getTime() + 7 * day);

  const params: Record<string, string> = {
    'range[begin_at]': `${monday.toISOString()},${sunday.toISOString()}`,
    per_page: '100',
    page: '1',
  };
  let page = 1;
  const logtimesByUser = new Map<number, Array<{ beginAt: Date; endAt: Date }>>();
  while (page <= 200) {
    params.page = String(page);
    process.stdout.write(`  locations page ${page}\n`);
    const { data } = await fetchLocations(params);
    if (!data.length) break;
    for (const entry of data) {
      if (!entry.user?.id) continue;
      const beginAt = new Date(entry.begin_at);
      const endAt = entry.end_at ? new Date(entry.end_at) : new Date();
      if (!logtimesByUser.has(entry.user.id)) {
        logtimesByUser.set(entry.user.id, []);
      }
      logtimesByUser.get(entry.user.id)!.push({ beginAt, endAt });
    }
    if (data.length < 100) break;
    page += 1;
    await sleep(250);
  }

  const updateStmt = db.prepare('UPDATE users SET weekly_logtime = ? WHERE id = ?');
  for (const [userId, entries] of logtimesByUser.entries()) {
    entries.sort((a, b) => a.beginAt.getTime() - b.beginAt.getTime());
    let total = 0;
    let prevEnd: Date | null = null;
    for (const entry of entries) {
      if (prevEnd && entry.beginAt < prevEnd) {
        entry.beginAt = prevEnd;
      }
      if (entry.endAt > entry.beginAt) {
        total += entry.endAt.getTime() - entry.beginAt.getTime();
        prevEnd = entry.endAt;
      }
    }
    updateStmt.run(Math.floor(total / 60000), userId);
  }
}

async function syncCampuses() {
  const db = getDb();
  let page = 1;
  const perPage = 100;
  const campuses: Campus[] = [];
  process.stdout.write(`Sync: loading campuses from ${config.apiBaseUrl}...\n`);
  while (page <= 50) {
    process.stdout.write(`  campuses page ${page}\n`);
    const { data } = await fetchCampuses(page, perPage);
    if (!data.length) break;
    campuses.push(...data);
    if (data.length < perPage) break;
    page += 1;
    await sleep(200);
  }

  process.stdout.write(`Sync: campuses loaded ${campuses.length}\n`);
  if (!campuses.length) {
    throw new Error('No campuses returned. Check API_BASE_URL and credentials.');
  }

  const now = Date.now();
  campuses.forEach((campus) => {
    upsertCampus({
      id: campus.id,
      name: campus.name,
      city: campus.city,
      country: campus.country,
      updated_at: now,
    });
  });

  return campuses;
}

async function syncCampusUsers(campus: Campus) {
  let page = 1;
  const perPage = 100;
  const now = Date.now();
  process.stdout.write(`Sync: campus ${campus.name} (${campus.id})\n`);
  const db = getDb();
  while (page <= 200) {
    const { data } = await fetchCampusUsers(campus.id, page, perPage);
    if (!data.length) break;
    process.stdout.write(`  page ${page} (${data.length} users)\n`);
    for (const entry of data) {
      let full: UserProfile = entry;
      let level = extract42CursusLevel(full);
      if (level === null || !full.cursus_users) {
        try {
          const response = await fetchUserProfile(entry.login);
          full = response.data;
          level = extract42CursusLevel(full);
        } catch {
          level = null;
        }
        await sleep(120);
      }
      if (level === null) continue;

      const cursusEntry = find42CursusEntry(full);
      const campusEntry = pickPrimaryCampus(full, campus);
      const beginAt = cursusEntry?.begin_at ?? null;
      const promo = formatPromo(beginAt);
      const coalitionName = await resolveCoalition(full.id);
      upsertUser({
        id: entry.id,
        login: entry.login,
        displayname: full.displayname || entry.displayname || entry.login,
        title: full.title ? full.title.replace(/%login/g, entry.login) : null,
        image_url: full.image?.versions?.small || full.image?.link || entry.image?.link || null,
        campus_id: campusEntry?.id ?? campus.id,
        campus_name: campusEntry?.name ?? campus.name,
        level,
        weekly_logtime: null,
        correction_points: full.correction_point ?? null,
        wallets: full.wallet ?? null,
        blackholed_at: cursusEntry?.blackholed_at ?? null,
        coalition_name: coalitionName,
        begin_at: beginAt,
        promo,
        updated_at: now,
      });
    }
    if (data.length < perPage) break;
    page += 1;
  }
  await syncWeeklyLogtime(db);
}

export async function syncAll() {
  const db = getDb();
  db.exec('BEGIN');
  db.exec('COMMIT');

  const campuses = await syncCampuses();
  const filtered = config.campusIds.length
    ? campuses.filter((campus) => config.campusIds.includes(campus.id))
    : campuses;
  if (!filtered.length) {
    process.stdout.write('Sync: no campuses selected. Check LEADERBOARD_CAMPUS_IDS.\n');
  }

  for (const campus of filtered) {
    await syncCampusUsers(campus);
  }
}

if (process.argv[1] && process.argv[1].endsWith('sync.ts')) {
  syncAll()
    .then(() => {
      process.stdout.write('Sync completed.\n');
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`${err}\n`);
      process.exit(1);
    });
}
