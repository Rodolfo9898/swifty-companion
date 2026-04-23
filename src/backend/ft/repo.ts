import type { FortyTwoUser } from '../../frontend/types/fortyTwo';
import { createFtClient, readTotal } from './client';
export type {
  Campus,
  MeProfile,
  ProjectInfo,
  ProjectTag,
  UserEventItem,
  UserSummary,
} from './types';
import type {
  Campus,
  MeProfile,
  ProjectInfo,
  ProjectTag,
  UserEventItem,
  UserSummary,
} from './types';

export class FtRepo {
  private readonly client = createFtClient();

  constructor() {}

  async fetchMe() {
    const { data } = await this.client.request<MeProfile>('/v2/me');
    return data;
  }

  async fetchMeProfile() {
    const { data } = await this.client.request<FortyTwoUser>('/v2/me');
    return data;
  }

  async fetchCampuses(page = 1, perPage = 50) {
    const { data } = await this.client.request<Campus[]>(`/v2/campus?per_page=${perPage}&page=${page}`);
    return data;
  }

  async fetchUsers(page = 1, perPage = 20) {
    const response = await this.client.request<UserSummary[]>(`/v2/users?per_page=${perPage}&page=${page}`);
    return { data: response.data, total: readTotal(response.headers) };
  }

  async fetchCampusUsers(campusId: number, page = 1, perPage = 20) {
    const response = await this.client.request<UserSummary[]>(
      `/v2/campus/${campusId}/users?per_page=${perPage}&page=${page}`,
    );
    return { data: response.data, total: readTotal(response.headers) };
  }

  async fetchUserProfile(login: string) {
    const safeLogin = login.trim().toLowerCase();
    const { data } = await this.client.request<FortyTwoUser>(`/v2/users/${safeLogin}`);
    return data;
  }

  async fetchProjectBySlug(slug: string) {
    const { data } = await this.client.request<ProjectInfo[]>(
      `/v2/projects?filter[slug]=${encodeURIComponent(slug)}&per_page=1`,
    );
    return data[0] ?? null;
  }

  async fetchProjectByName(name: string) {
    const { data } = await this.client.request<ProjectInfo[]>(
      `/v2/projects?filter[name]=${encodeURIComponent(name)}&per_page=1`,
    );
    return data[0] ?? null;
  }

  async fetchProjectTags(projectId: number) {
    const { data } = await this.client.request<ProjectTag[]>(`/v2/projects/${projectId}/tags`);
    return data;
  }

  async fetchUserEvents(userId: number, page = 1, perPage = 100) {
    const { data } = await this.client.request<UserEventItem[]>(
      `/v2/users/${userId}/events?per_page=${perPage}&page=${page}`,
    );
    return data;
  }
}

export const ftRepo = new FtRepo();

export async function fetchMe() {
  return ftRepo.fetchMe();
}

export async function fetchMeProfile() {
  return ftRepo.fetchMeProfile();
}

export async function fetchCampuses(page = 1, perPage = 50) {
  return ftRepo.fetchCampuses(page, perPage);
}

export async function fetchUsers(page = 1, perPage = 20) {
  return ftRepo.fetchUsers(page, perPage);
}

export async function fetchCampusUsers(campusId: number, page = 1, perPage = 20) {
  return ftRepo.fetchCampusUsers(campusId, page, perPage);
}

export async function fetchUserProfile(login: string) {
  return ftRepo.fetchUserProfile(login);
}

export async function fetchProjectBySlug(slug: string) {
  return ftRepo.fetchProjectBySlug(slug);
}

export async function fetchProjectByName(name: string) {
  return ftRepo.fetchProjectByName(name);
}

export async function fetchProjectTags(projectId: number) {
  return ftRepo.fetchProjectTags(projectId);
}

export async function fetchUserEvents(userId: number, page = 1, perPage = 100) {
  return ftRepo.fetchUserEvents(userId, page, perPage);
}
