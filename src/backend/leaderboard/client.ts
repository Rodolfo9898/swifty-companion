import { getConfig } from '../core/config';
import { ApiClient } from '../core/http';

export function createLeaderboardClient() {
  const config = getConfig();
  const baseUrl = config.leaderboardApiUrl;
  return {
    baseUrl,
    client: baseUrl ? new ApiClient({ baseUrl, defaultHeaders: {} }) : undefined,
  };
}

export function toCampus(campus: {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
}) {
  return {
    id: campus.id,
    name: campus.name,
    city: campus.city ?? '',
    country: campus.country ?? '',
  };
}
