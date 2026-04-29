import { AUTH_ID, sessionStore, type AuthState, type SessionStore } from './store';
import { consumeWebLoginCode, exchangeToken, requestLoginCode, scheduleUserRefresh } from './client';

const TOKEN_EXPIRY_BUFFER_MS = 30_000;

export class UserAuth {
  private readonly store: SessionStore;

  constructor(store: SessionStore) {
    this.store = store;
  }

  async login(): Promise<AuthState> {
    const { code, redirectUri, codeVerifier } = await requestLoginCode();
    return this.persistToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
  }

  async refresh(): Promise<AuthState> {
    const current = await this.store.getById(AUTH_ID);
    if (!current?.refreshToken) {
      throw new Error('Missing refresh token. Please login again.');
    }
    return this.persistToken({
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken,
    });
  }

  async ensureToken(): Promise<string> {
    const current = (this.store.getCached() ?? (await this.store.getById(AUTH_ID))) ?? null;
    if (isFresh(current)) {
      return current!.accessToken;
    }
    if (current?.refreshToken) {
      const refreshed = await this.refresh();
      return refreshed.accessToken;
    }
    throw new Error('Session expired. Please login again.');
  }

  async getState() {
    const webLogin = await consumeWebLoginCode();
    if (webLogin) {
      return this.persistToken({
        grant_type: 'authorization_code',
        code: webLogin.code,
        redirect_uri: webLogin.redirectUri,
        code_verifier: webLogin.codeVerifier,
      });
    }
    return this.store.getById(AUTH_ID);
  }

  async logout() {
    await this.store.delete(AUTH_ID);
  }

  private async persistToken(params: Record<string, string>) {
    const state = await exchangeToken(params);
    await this.store.create(state);
    scheduleUserRefresh(state.expiresAt, async () => {
      await this.refresh();
    });
    return state;
  }
}

function isFresh(state: AuthState | null) {
  if (!state) return false;
  return state.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

export const userAuth = new UserAuth(sessionStore);
