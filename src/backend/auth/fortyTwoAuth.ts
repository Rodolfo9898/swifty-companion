import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

import { readLocalRuntimeSettings } from '../../frontend/utils/localSettings';
import { scheduleTokenRefresh } from '../bonus/tokenRefresh';
import { AuthState, clearAuthState, getCachedAuthState, loadAuthState, saveAuthState } from './authStore';

const { apiBaseUrl, clientId, clientSecret, proxyRedirectUri } = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  proxyRedirectUri?: string;
};

const API_BASE = apiBaseUrl || 'https://api.intra.42.fr';
const AUTH_ENDPOINT = `${API_BASE}/oauth/authorize`;
const TOKEN_ENDPOINT = `${API_BASE}/oauth/token`;

const TOKEN_EXPIRY_BUFFER_MS = 30_000;
const REDIRECT_URI = 'swifty-companion://redirect';
const isExpoGo = Constants.appOwnership === 'expo';
const useProxy = isExpoGo && Boolean(proxyRedirectUri);

async function getClientSecret() {
  const settings = await readLocalRuntimeSettings();
  return settings.ftClientSecret.trim() || clientSecret || '';
}

async function requireCredentials() {
  const resolvedClientSecret = await getClientSecret();
  if (!clientId || !resolvedClientSecret) {
    throw new Error('Missing FT_CLIENT_ID or FT_CLIENT_SECRET. Add them to a local .env file.');
  }
  return resolvedClientSecret;
}

function isTokenFresh(state: AuthState | null) {
  if (!state) return false;
  return state.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

function getRedirectUri() {
  if (useProxy && proxyRedirectUri) {
    return proxyRedirectUri;
  }
  return AuthSession.makeRedirectUri({
    scheme: 'swifty-companion',
    path: 'redirect',
    native: REDIRECT_URI,
  });
}

async function exchangeToken(params: Record<string, string>): Promise<AuthState> {
  const resolvedClientSecret = await requireCredentials();

  const body = new URLSearchParams({
    client_id: clientId!,
    client_secret: resolvedClientSecret,
    ...params,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
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

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    scope?: string;
  };

  const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  const authState: AuthState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    tokenType: data.token_type,
    scope: data.scope ?? null,
    expiresAt,
  };

  await saveAuthState(authState);
  scheduleTokenRefresh(expiresAt, async () => {
    await refreshAccessToken();
  });

  return authState;
}

export async function loginWith42(): Promise<AuthState> {
  await requireCredentials();
  const redirectUri = getRedirectUri();
  const discovery = {
    authorizationEndpoint: AUTH_ENDPOINT,
    tokenEndpoint: TOKEN_ENDPOINT,
  };

  const request = new AuthSession.AuthRequest({
    clientId: clientId!,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['public'],
  });

  const result = await request.promptAsync(discovery, { useProxy });
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Login cancelled. Please try again.');
  }

  return exchangeToken({
    grant_type: 'authorization_code',
    code: result.params.code,
    redirect_uri: redirectUri,
  });
}

export async function refreshAccessToken(): Promise<AuthState> {
  const current = await loadAuthState();
  if (!current?.refreshToken) {
    throw new Error('Missing refresh token. Please login again.');
  }
  return exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: current.refreshToken,
  });
}

export async function ensureAccessToken(): Promise<string> {
  const current = (getCachedAuthState() ?? (await loadAuthState())) ?? null;
  if (isTokenFresh(current)) {
    return current!.accessToken;
  }

  if (current?.refreshToken) {
    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
  }

  throw new Error('Session expired. Please login again.');
}

export async function getAuthState(): Promise<AuthState | null> {
  return loadAuthState();
}

export async function logout(): Promise<void> {
  await clearAuthState();
}
