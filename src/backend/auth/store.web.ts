import type { CrudRepo } from '../core/repo';

export interface AuthState {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  scope?: string | null;
  expiresAt: number;
}

export const AUTH_ID = 'swifty-auth-state';

export class SessionStore implements CrudRepo<AuthState, string, AuthState, Partial<AuthState>> {
  private cached: AuthState | null = null;
  private hydrated = false;

  async list(): Promise<AuthState[]> {
    const current = await this.getById(AUTH_ID);
    return current ? [current] : [];
  }

  async getById(id: string): Promise<AuthState | null> {
    if (id !== AUTH_ID) {
      return null;
    }
    if (this.hydrated) {
      return this.cached;
    }
    const stored = globalThis.localStorage?.getItem(AUTH_ID);
    this.hydrated = true;
    if (!stored) {
      this.cached = null;
      return null;
    }
    try {
      this.cached = JSON.parse(stored) as AuthState;
    } catch {
      this.cached = null;
    }
    return this.cached;
  }

  async create(data: AuthState): Promise<AuthState> {
    this.cached = data;
    this.hydrated = true;
    globalThis.localStorage?.setItem(AUTH_ID, JSON.stringify(data));
    return data;
  }

  async update(id: string, data: Partial<AuthState>): Promise<AuthState> {
    if (id !== AUTH_ID) {
      throw new Error('Unknown auth state key.');
    }
    const current = await this.getById(AUTH_ID);
    if (!current) {
      throw new Error('Auth state does not exist.');
    }
    const next = { ...current, ...data };
    await this.create(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    if (id !== AUTH_ID) {
      return;
    }
    this.cached = null;
    this.hydrated = true;
    globalThis.localStorage?.removeItem(AUTH_ID);
  }

  getCached(): AuthState | null {
    return this.cached;
  }
}

export const sessionStore = new SessionStore();
