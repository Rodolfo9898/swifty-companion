import { readLocalRuntimeSettings } from '../../frontend/utils/localSettings';
import { getConfig } from '../core/config';
import { getRefreshLeadTime, scheduleRefresh, setRefreshLeadTime } from '../core/refresh';
import type { TokenSource } from '../core/http';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class FtToken implements TokenSource {
  private readonly config = getConfig();
  private cached: TokenCache | null = null;
  private inflight: Promise<string> | null = null;

  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.isValid(this.cached)) {
      return this.cached!.token;
    }
    if (this.inflight && !forceRefresh) {
      return this.inflight;
    }
    this.inflight = this.requestToken();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  }

  async refresh() {
    await this.getAccessToken(true);
    return this.status();
  }

  status() {
    return {
      hasToken: Boolean(this.cached),
      expiresAt: this.cached?.expiresAt ?? null,
    };
  }

  setLead(minutes: number) {
    const ms = minutes * 60_000;
    setRefreshLeadTime(ms);
    if (this.cached?.expiresAt) {
      scheduleRefresh(this.cached.expiresAt, async () => {
        await this.getAccessToken(true);
      });
    }
    return getRefreshLeadTime();
  }

  private isValid(token: TokenCache | null) {
    if (!token) return false;
    return token.expiresAt > Date.now() + 15_000;
  }

  private async requestToken(): Promise<string> {
    const settings = await readLocalRuntimeSettings();
    const secret = settings.ftClientSecret.trim() || this.config.clientSecret;
    if (!this.config.clientId || !secret) {
      throw new Error('Missing FT_CLIENT_ID or FT_CLIENT_SECRET. Add them to a local .env file.');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: secret,
    });

    const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
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
      expires_in: number;
    };
    const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
    this.cached = { token: data.access_token, expiresAt };
    scheduleRefresh(expiresAt, async () => {
      await this.getAccessToken(true);
    });
    return this.cached.token;
  }
}

export const ftToken = new FtToken();

export async function getAccessToken(forceRefresh = false) {
  return ftToken.getAccessToken(forceRefresh);
}

export function getTokenStatus() {
  return ftToken.status();
}

export async function refreshToken() {
  return ftToken.refresh();
}

export function updateRefreshLeadTime(minutes: number) {
  return ftToken.setLead(minutes);
}
