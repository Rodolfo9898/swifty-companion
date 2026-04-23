import { userAuth } from '../auth/user';
import { getConfig } from '../core/config';
import { ApiClient } from '../core/http';
import type { AuthState } from '../auth/store';

const TOTAL_HEADERS = ['x-total', 'x-total-count', 'x-total-counts'];

export function createFtClient() {
    const config = getConfig();
    return new ApiClient({
      baseUrl: config.apiBaseUrl,
      tokenSource: {
        getAccessToken: (forceRefresh?: boolean) =>
          forceRefresh ? userAuth.refresh().then((state: AuthState) => state.accessToken) : userAuth.ensureToken(),
      },
    });
}

export function readTotal(headers: Headers) {
  for (const key of TOTAL_HEADERS) {
    const value = headers.get(key);
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}
