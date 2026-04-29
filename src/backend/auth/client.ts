import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { readLocalRuntimeSettings } from '../../frontend/utils/localSettings';
import { getConfig } from '../core/config';
import { scheduleRefresh } from '../core/refresh';
import type { AuthState } from './store';

const REDIRECT_URI = 'swifty-companion://redirect';
const WEB_OAUTH_STORAGE_KEY = 'swifty-web-oauth';

type TokenPayload = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

type WebOAuthState = {
  codeVerifier: string;
  redirectUri: string;
  state: string;
};

export async function requireClientSecret() {
  const config = getConfig();
  if (Platform.OS === 'web') {
    const credentials = getOAuthCredentials();
    if (!credentials.clientId) {
      throw new Error('Missing FT_CLIENT_ID. Add it to a local .env file.');
    }
    return '';
  }
  const settings = await readLocalRuntimeSettings();
  const credentials = getOAuthCredentials();
  const secret = settings.ftClientSecret.trim() || credentials.clientSecret;
  if (!credentials.clientId || !secret) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Missing FT_CLIENT_ID or FT_CLIENT_AUTH. Add them to a local .env file.'
        : 'Missing FT_CLIENT_ID or FT_CLIENT_AUTH. Add them to a local .env file.',
    );
  }
  return secret;
}

function getDefaultWebRedirectUri() {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
}

function getOAuthCredentials() {
  const config = getConfig();
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function randomBase64Url(byteCount = 32) {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Base64Url(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
}

function cleanWebOAuthUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, window.location.pathname || '/');
}

export function getRedirectUri() {
  const config = getConfig();
  if (Platform.OS === 'web') {
    return config.webRedirectUri || getDefaultWebRedirectUri();
  }
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
  const credentials = getOAuthCredentials();
  await requireClientSecret();
  const redirectUri = getRedirectUri();
  if (Platform.OS === 'web') {
    const state = randomBase64Url(24);
    const codeVerifier = randomBase64Url(64);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    sessionStorage.setItem(WEB_OAUTH_STORAGE_KEY, JSON.stringify({ codeVerifier, redirectUri, state }));
    console.info(`[42 OAuth] redirect_uri=${redirectUri}`);
    const authorizeUrl = new URL(`${config.apiBaseUrl}/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', credentials.clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'public');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    window.location.assign(authorizeUrl.toString());
    await new Promise(() => {});
  }
  const discovery = {
    authorizationEndpoint: `${config.apiBaseUrl}/oauth/authorize`,
    tokenEndpoint: `${config.apiBaseUrl}/oauth/token`,
  };

  const request = new AuthSession.AuthRequest({
    clientId: credentials.clientId,
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
    codeVerifier: request.codeVerifier,
  };
}

export async function consumeWebLoginCode() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    return null;
  }
  const stored = sessionStorage.getItem(WEB_OAUTH_STORAGE_KEY);
  sessionStorage.removeItem(WEB_OAUTH_STORAGE_KEY);
  if (!stored) {
    cleanWebOAuthUrl();
    throw new Error('Missing web OAuth state. Please start login again.');
  }
  const oauthState = JSON.parse(stored) as WebOAuthState;
  const returnedState = params.get('state');
  if (!returnedState || returnedState !== oauthState.state) {
    cleanWebOAuthUrl();
    throw new Error('Invalid web OAuth state. Please start login again.');
  }
  cleanWebOAuthUrl();
  console.info('[42 OAuth] consuming same-window web callback');
  return {
    code,
    redirectUri: oauthState.redirectUri,
    codeVerifier: oauthState.codeVerifier,
  };
}

export async function exchangeToken(params: Record<string, string>) {
  const config = getConfig();
  const credentials = getOAuthCredentials();
  if (Platform.OS === 'web') {
    console.info('[42 OAuth] exchanging code through /oauth/token proxy');
    const response = await fetch('/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        ...params,
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[42 OAuth] token exchange failed: ${response.status} ${text || response.statusText}`);
      throw new Error(`Unable to retrieve access token (${response.status}): ${text || response.statusText}`);
    }

    const data = (await response.json()) as TokenPayload;
    console.info('[42 OAuth] token exchange succeeded');
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      tokenType: data.token_type,
      scope: data.scope ?? null,
      expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
    };
  }
  const clientSecret = await requireClientSecret();
  const body = new URLSearchParams({
    client_id: credentials.clientId,
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
