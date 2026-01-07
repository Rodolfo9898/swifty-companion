import Constants from 'expo-constants';

import { ensureAccessToken, refreshAccessToken } from '../auth/fortyTwoAuth';
import type { FortyTwoUser } from '../../frontend/types/fortyTwo';

const { apiBaseUrl } = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
};

const API_BASE = apiBaseUrl || 'https://api.intra.42.fr';

const TOTAL_HEADERS = ['x-total', 'x-total-count', 'x-total-counts'];

function getTotalFromHeaders(headers: Headers) {
  for (const key of TOTAL_HEADERS) {
    const value = headers.get(key);
    if (value) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function authorizedRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  attempt = 0,
) {
  const token = await ensureAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    await refreshAccessToken();
    return authorizedRequest<T>(path, options, false, attempt);
  }

  if (response.status === 429 && attempt < DEFAULT_MAX_RETRIES) {
    const retryAfter = response.headers.get('retry-after');
    const retryMs = retryAfter ? Number(retryAfter) * 1000 : DEFAULT_BACKOFF_MS * 2 ** attempt;
    await sleep(retryMs);
    return authorizedRequest<T>(path, options, retry, attempt + 1);
  }

  if (!response.ok) {
    const message = await response.text();
    const errorMessage = message?.trim() || response.statusText || 'Request failed';
    throw new Error(`${response.status} - ${errorMessage}`);
  }

  const data = (await response.json()) as T;
  const total = getTotalFromHeaders(response.headers);
  return { data, total };
}

export interface Campus {
  id: number;
  name: string;
  city: string;
  country: string;
  users_count?: number;
}

export interface UserSummary {
  id: number;
  login: string;
  displayname?: string;
  image?: {
    link?: string | null;
  };
  level?: number;
  cursus_users?: Array<{
    level: number;
    cursus?: { id: number; slug?: string | null; name?: string | null };
  }>;
}

export interface MeProfile {
  id: number;
  login: string;
  displayname: string;
  email: string;
  image?: {
    link?: string | null;
  };
  cursus_users?: Array<{
    level: number;
    cursus: { id: number; slug?: string; name: string };
  }>;
}

export interface ProjectInfo {
  id: number;
  name: string;
  slug: string;
  difficulty?: number;
}

export interface ProjectTag {
  id: number;
  name: string;
}

export interface UserEventItem {
  id: number;
  event: {
    id: number;
    name: string;
    kind?: string | null;
  };
}

export async function fetchMe() {
  const { data } = await authorizedRequest<MeProfile>('/v2/me');
  return data;
}

export async function fetchMeProfile() {
  const { data } = await authorizedRequest<FortyTwoUser>('/v2/me');
  return data;
}

export async function fetchCampuses(page = 1, perPage = 50) {
  const { data } = await authorizedRequest<Campus[]>(
    `/v2/campus?per_page=${perPage}&page=${page}`,
  );
  return data;
}

export async function fetchUsers(page = 1, perPage = 20) {
  return authorizedRequest<UserSummary[]>(
    `/v2/users?per_page=${perPage}&page=${page}`,
  );
}

export async function fetchCampusUsers(campusId: number, page = 1, perPage = 20) {
  return authorizedRequest<UserSummary[]>(
    `/v2/campus/${campusId}/users?per_page=${perPage}&page=${page}`,
  );
}

export async function fetchUserProfile(login: string) {
  const safeLogin = login.trim().toLowerCase();
  const { data } = await authorizedRequest(`/v2/users/${safeLogin}`);
  return data;
}

export async function fetchProjectBySlug(slug: string) {
  const { data } = await authorizedRequest<ProjectInfo[]>(
    `/v2/projects?filter[slug]=${encodeURIComponent(slug)}&per_page=1`,
  );
  return data[0] ?? null;
}

export async function fetchProjectByName(name: string) {
  const { data } = await authorizedRequest<ProjectInfo[]>(
    `/v2/projects?filter[name]=${encodeURIComponent(name)}&per_page=1`,
  );
  return data[0] ?? null;
}

export async function fetchProjectTags(projectId: number) {
  const { data } = await authorizedRequest<ProjectTag[]>(
    `/v2/projects/${projectId}/tags`,
  );
  return data;
}

export async function fetchUserEvents(userId: number, page = 1, perPage = 100) {
  const { data } = await authorizedRequest<UserEventItem[]>(
    `/v2/users/${userId}/events?per_page=${perPage}&page=${page}`,
  );
  return data;
}
