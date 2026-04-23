import {
  getLocalSqliteLeaderboardCampuses,
  getLocalSqliteLeaderboardPage,
  getLocalSqliteLeaderboardPromos,
  getLocalSqliteLeaderboardStatus,
  getLocalSqliteLeaderboardTop,
} from '../../frontend/utils/localLeaderboardSqlite';
import { createLeaderboardClient, toCampus } from './client';
export type {
  LeaderboardCampus,
  LeaderboardPage,
  LeaderboardUser,
} from './types';
import type {
  LeaderboardCampus,
  LeaderboardPage,
  LeaderboardUser,
} from './types';

export class LeaderboardRepo {
  private readonly api = createLeaderboardClient();

  constructor() {}

  isEnabled() {
    return Boolean(this.api.baseUrl);
  }

  async fetchCampuses(): Promise<LeaderboardCampus[]> {
    if (!this.api.client) {
      const campuses = await getLocalSqliteLeaderboardCampuses();
      return campuses.map(toCampus);
    }
    const { data } = await this.api.client.request<Array<{
      id: number;
      name: string;
      city?: string | null;
      country?: string | null;
    }>>('/campuses');
    return data.map(toCampus);
  }

  async fetchPage(params: {
    campusId?: number;
    promo?: string;
    search?: string;
    sortField?: string;
    page?: number;
    perPage?: number;
    sort?: 'asc' | 'desc';
    meLogin?: string;
  }) {
    if (!this.api.client) {
      return getLocalSqliteLeaderboardPage(params);
    }
    const search = new URLSearchParams();
    if (params.campusId) search.set('campusId', String(params.campusId));
    if (params.promo) search.set('promo', params.promo);
    if (params.search) search.set('search', params.search);
    if (params.sortField) search.set('sortField', params.sortField);
    if (params.page) search.set('page', String(params.page));
    if (params.perPage) search.set('perPage', String(params.perPage));
    if (params.sort) search.set('sort', params.sort);
    if (params.meLogin) search.set('meLogin', params.meLogin);
    const suffix = search.toString();
    const { data } = await this.api.client.request<LeaderboardPage>(`/leaderboard${suffix ? `?${suffix}` : ''}`);
    return data;
  }

  async fetchTop(params: { campusId?: number; promo?: string; limit?: number; excludeLogin?: string }) {
    if (!this.api.client) {
      return getLocalSqliteLeaderboardTop(params);
    }
    const search = new URLSearchParams();
    if (params.campusId) search.set('campusId', String(params.campusId));
    if (params.promo) search.set('promo', params.promo);
    if (params.limit) search.set('limit', String(params.limit));
    if (params.excludeLogin) search.set('excludeLogin', params.excludeLogin);
    const suffix = search.toString();
    const { data } = await this.api.client.request<LeaderboardUser[]>(`/leaderboard/top${suffix ? `?${suffix}` : ''}`);
    return data;
  }

  async fetchPromos(params: { campusId?: number }) {
    if (!this.api.client) {
      return getLocalSqliteLeaderboardPromos(params);
    }
    const search = new URLSearchParams();
    if (params.campusId) search.set('campusId', String(params.campusId));
    const suffix = search.toString();
    const { data } = await this.api.client.request<string[]>(`/promos${suffix ? `?${suffix}` : ''}`);
    return data;
  }

  async fetchStatus() {
    if (!this.api.client) {
      return getLocalSqliteLeaderboardStatus();
    }
    const { data } = await this.api.client.request<{
      users: number;
      campuses: number;
      userCursusRows: number;
      lastUserUpdate: number | null;
    }>('/status');
    return data;
  }

  async sync(params?: { campusIds?: number[] }) {
    if (!this.api.client) {
      throw new Error('Missing LEADERBOARD_API_URL in .env.');
    }
    const search = new URLSearchParams();
    const campusIds = (params?.campusIds || [])
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry) && entry > 0);
    if (campusIds.length) {
      search.set('campusIds', campusIds.join(','));
    }
    const suffix = search.toString();
    const { data } = await this.api.client.request<{ status: string }>(`/sync${suffix ? `?${suffix}` : ''}`, {
      method: 'POST',
    });
    return data;
  }
}

export const leaderboardRepo = new LeaderboardRepo();
