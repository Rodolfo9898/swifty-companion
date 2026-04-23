import type { FortyTwoUser } from '../../frontend/types/fortyTwo';
import { getConfig } from '../core/config';
import { ApiClient } from '../core/http';
import { ftToken } from './token';

export class FtPublicRepo {
  private readonly client: ApiClient;

  constructor() {
    const config = getConfig();
    this.client = new ApiClient({
      baseUrl: config.apiBaseUrl,
      tokenSource: ftToken,
      mapError: (response, message) => {
        if (response.status === 404) {
          return new Error('User not found. Check the login and try again.');
        }
        if (response.status >= 500) {
          return new Error('Intra API is unavailable right now. Please try again later.');
        }
        return new Error(`${response.status} - ${message}`);
      },
    });
  }

  async fetchUserProfile(login: string): Promise<FortyTwoUser> {
    const safeLogin = login.trim().toLowerCase();
    const { data } = await this.client.request<FortyTwoUser>(`/v2/users/${safeLogin}`);
    return data;
  }
}

export const ftPublicRepo = new FtPublicRepo();
