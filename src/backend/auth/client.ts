import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

import { readLocalRuntimeSettings } from '../../frontend/utils/localSettings';
import { getConfig } from '../core/config';
import { scheduleRefresh } from '../core/refresh';
import type { AuthState } from './store';

const REDIRECT_URI = 'swifty-companion://redirect';

type TokenPayload = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export async function requireClientSecret() {
  const config = getConfig();
  const settings = await readLocalRuntimeSettings();
  const secret = settings.ftClientSecret.trim() || config.clientSecret;
  if (!config.clientId || !secret) {
    throw new Error('Missing FT_CLIENT_ID or FT_CLIENT_SECRET. Add them to a local .env file.');
  }
  return secret;
}

export function getRedirectUri() {
  const config = getConfig();
  if (Constants.appOwnership === 'expo' && config.proxyRedirectUri) {
    return config.proxyRedirectUri;
  }
  return AuthSession.makeRedirectUri({
    scheme: 'swifty-companion',
    path: 'redirect',
    native: REDIRECT_URI,
  });
}

export async function requestLoginCode() {
  const config = getConfig();
  await requireClientSecret();
  const redirectUri = getRedirectUri();
  const discovery = {
    authorizationEndpoint: `${config.apiBaseUrl}/oauth/authorize`,
    tokenEndpoint: `${config.apiBaseUrl}/oauth/token`,
  };

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['public'],
  });

  const result = await request.promptAsync(discovery);
  if (result.type === 'error') {
    const details = [
      result.params.error,
      result.params.error_description,
      result.error?.message,
    ]
      .filter(Boolean)
      .join(' | ');
    throw new Error(`OAuth login failed${details ? `: ${details}` : '.'}`);
  }
  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`Login cancelled (${result.type}). Please try again.`);
  }

  return {
    code: result.params.code,
    redirectUri,
  };
}

export async function exchangeToken(params: Record<string, string>) {
  const config = getConfig();
  const clientSecret = await requireClientSecret();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: clientSecret,
    ...params,
  });

  const response = await fetch(`${config.apiBaseUrl}/oauth/token`, {
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

  const data = (await response.json()) as TokenPayload;
  const state: AuthState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    tokenType: data.token_type,
    scope: data.scope ?? null,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
  return state;
}

export function scheduleUserRefresh(expiresAt: number, refreshFn: () => Promise<void>) {
  scheduleRefresh(expiresAt, refreshFn);
}
