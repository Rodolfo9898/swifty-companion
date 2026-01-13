import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ??
  (Constants as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra ??
  (Constants as { manifest2?: { extra?: Record<string, unknown> } }).manifest2?.extra ??
  {}) as Record<string, unknown>;

const envLeaderboardUrl =
  (typeof process !== 'undefined' &&
    (process.env?.EXPO_PUBLIC_LEADERBOARD_API_URL || process.env?.LEADERBOARD_API_URL)) ||
  '';
const leaderboardApiUrl = String(extra.leaderboardApiUrl || envLeaderboardUrl || '');

export interface LeaderboardCampus {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface LeaderboardUser {
  id: number;
  login: string;
  displayname?: string | null;
  title?: string | null;
  image?: string | null;
  campusId?: number | null;
  campusName?: string | null;
  level: number | null;
  weekly_logtime?: number | null;
  correction_points?: number | null;
  wallets?: number | null;
  blackholed_at?: string | null;
  coalition_name?: string | null;
  promo?: string | null;
}

export interface LeaderboardPage {
  data: LeaderboardUser[];
  total: number;
  page: number;
  perPage: number;
}

function ensureApi() {
  if (!leaderboardApiUrl) {
    throw new Error('Missing LEADERBOARD_API_URL in .env.');
  }
}

async function request<T>(path: string): Promise<T> {
  ensureApi();
  const response = await fetch(`${leaderboardApiUrl}${path}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText || 'Leaderboard request failed');
  }
  return response.json() as Promise<T>;
}

export function isLeaderboardApiEnabled() {
  return Boolean(leaderboardApiUrl);
}

export async function fetchLeaderboardCampuses() {
  return request<LeaderboardCampus[]>('/campuses');
}

export async function fetchLeaderboardPage(params: {
  campusId?: number;
  promo?: string;
  search?: string;
  sortField?: string;
  page?: number;
  perPage?: number;
  sort?: 'asc' | 'desc';
  meLogin?: string;
}) {
  const search = new URLSearchParams();
  if (params.campusId) search.set('campusId', String(params.campusId));
  if (params.promo) search.set('promo', params.promo);
  if (params.search) search.set('search', params.search);
  if (params.sortField) search.set('sortField', params.sortField);
  if (params.page) search.set('page', String(params.page));
  if (params.perPage) search.set('perPage', String(params.perPage));
  if (params.sort) search.set('sort', params.sort);
  if (params.meLogin) search.set('meLogin', params.meLogin);
  return request<LeaderboardPage>(`/leaderboard?${search.toString()}`);
}

export async function fetchLeaderboardTop(params: { campusId?: number; promo?: string; limit?: number; excludeLogin?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set('campusId', String(params.campusId));
  if (params.promo) search.set('promo', params.promo);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.excludeLogin) search.set('excludeLogin', params.excludeLogin);
  return request<LeaderboardUser[]>(`/leaderboard/top?${search.toString()}`);
}

export async function fetchLeaderboardPromos(params: { campusId?: number }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set('campusId', String(params.campusId));
  return request<string[]>(`/promos?${search.toString()}`);
}
