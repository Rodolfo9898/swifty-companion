import Constants from 'expo-constants';
import { FortyTwoTokenResponse, FortyTwoUser } from '../../frontend/types/fortyTwo';
import { readLocalRuntimeSettings } from '../../frontend/utils/localSettings';
import { getRefreshLeadTime, scheduleTokenRefresh, setRefreshLeadTime } from '../bonus/tokenRefresh';

const { apiBaseUrl, clientId, clientSecret } = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
};

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;
let inflightTokenPromise: Promise<string> | null = null;

const API_BASE = apiBaseUrl || 'https://api.intra.42.fr';

function isTokenValid(token: TokenCache | null) {
  if (!token) return false;
  return token.expiresAt > Date.now() + 15_000; // small buffer to refresh before actual expiry
}

async function requestNewToken(): Promise<string> {
  const settings = await readLocalRuntimeSettings();
  const resolvedClientSecret = settings.ftClientSecret.trim() || clientSecret;
  if (!clientId || !resolvedClientSecret) {
    throw new Error('Missing FT_CLIENT_ID or FT_CLIENT_SECRET. Add them to a local .env file.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: resolvedClientSecret,
  });

  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to retrieve access token (${response.status}): ${text || response.statusText}`);
  }

  const data = (await response.json()) as FortyTwoTokenResponse;
  const expiresAt = Date.now() + data.expires_in * 1000 - 60_000; // refresh one minute early
  cachedToken = { token: data.access_token, expiresAt };
  scheduleTokenRefresh(expiresAt, async () => {
    await getAccessToken(true);
  });
  return cachedToken.token;
}

export async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && isTokenValid(cachedToken)) {
    return cachedToken!.token;
  }

  if (inflightTokenPromise && !forceRefresh) {
    return inflightTokenPromise;
  }

  inflightTokenPromise = requestNewToken();
  try {
    return await inflightTokenPromise;
  } finally {
    inflightTokenPromise = null;
  }
}

export function getTokenStatus() {
  return {
    hasToken: Boolean(cachedToken),
    expiresAt: cachedToken?.expiresAt ?? null,
  };
}

export async function refreshAccessToken() {
  await getAccessToken(true);
  return getTokenStatus();
}

export function updateRefreshLeadTime(minutes: number) {
  const ms = minutes * 60_000;
  setRefreshLeadTime(ms);
  if (cachedToken?.expiresAt) {
    scheduleTokenRefresh(cachedToken.expiresAt, async () => {
      await getAccessToken(true);
    });
  }
  return getRefreshLeadTime();
}

async function authorizedRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    // Token might be expired or revoked. Refresh and retry once.
    await getAccessToken(true);
    return authorizedRequest<T>(path, options, false);
  }

  if (!response.ok) {
    const message = await response.text();
    const errorMessage = message?.trim() || response.statusText || 'Request failed';
    if (response.status === 404) {
      throw new Error('User not found. Check the login and try again.');
    }
    if (response.status >= 500) {
      throw new Error('Intra API is unavailable right now. Please try again later.');
    }
    throw new Error(`${response.status} - ${errorMessage}`);
  }

  return (await response.json()) as T;
}

export async function fetchUserProfile(login: string): Promise<FortyTwoUser> {
  const safeLogin = login.trim().toLowerCase();
  return authorizedRequest<FortyTwoUser>(`/v2/users/${safeLogin}`);
}
