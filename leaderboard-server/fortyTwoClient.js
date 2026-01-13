import { config } from './config.js';

let tokenCache = null;
let inflight = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchToken() {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing FT_CLIENT_ID or FT_CLIENT_SECRET in .env');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(`${config.apiBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token error ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
  return tokenCache.token;
}

async function getToken(force = false) {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  if (inflight) return inflight;
  inflight = fetchToken();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

async function fetchJson(path, attempt = 0) {
  const token = await getToken();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && attempt < 1) {
    await getToken(true);
    return fetchJson(path, attempt + 1);
  }

  if (response.status === 429 && attempt < 6) {
    const retryAfter = Number(response.headers.get('retry-after') || 0);
    const waitMs = retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt;
    await sleep(waitMs);
    return fetchJson(path, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  return { data, headers: response.headers };
}

export async function fetchCampuses(page = 1, perPage = 100) {
  return fetchJson(`/v2/campus?page=${page}&per_page=${perPage}`);
}

export async function fetchCampusUsers(campusId, page = 1, perPage = 100) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return fetchJson(`/v2/campus/${campusId}/users?${params.toString()}`);
}

export async function fetchUserProfile(login) {
  return fetchJson(`/v2/users/${encodeURIComponent(login)}`);
}

export async function fetchUserCoalitions(userId) {
  return fetchJson(`/v2/users/${userId}/coalitions`);
}

export async function fetchLocations(params) {
  const search = new URLSearchParams(params);
  return fetchJson(`/v2/locations?${search.toString()}`);
}
