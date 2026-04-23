const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TokenSource {
  getAccessToken(forceRefresh?: boolean): Promise<string>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenSource?: TokenSource;
  defaultHeaders?: Record<string, string>;
  maxRetries?: number;
  backoffMs?: number;
  mapError?: (response: Response, message: string) => Error;
}

export interface ApiResult<T> {
  data: T;
  headers: Headers;
  status: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokenSource?: TokenSource;
  private readonly defaultHeaders: Record<string, string>;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly mapError?: (response: Response, message: string) => Error;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.tokenSource = options.tokenSource;
    this.defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' };
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
    this.mapError = options.mapError;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    state: { attempt?: number; allowAuthRetry?: boolean } = {},
  ): Promise<ApiResult<T>> {
    const attempt = state.attempt ?? 0;
    const allowAuthRetry = state.allowAuthRetry ?? true;
    const headers = await this.buildHeaders(options.headers);

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && allowAuthRetry && this.tokenSource) {
      await this.tokenSource.getAccessToken(true);
      return this.request<T>(path, options, { attempt, allowAuthRetry: false });
    }

    if (response.status === 429 && attempt < this.maxRetries) {
      const retryAfter = response.headers.get('retry-after');
      const retryMs = retryAfter ? Number(retryAfter) * 1000 : this.backoffMs * 2 ** attempt;
      await sleep(retryMs);
      return this.request<T>(path, options, { attempt: attempt + 1, allowAuthRetry });
    }

    if (!response.ok) {
      const message = (await response.text()).trim() || response.statusText || 'Request failed';
      throw this.mapError ? this.mapError(response, message) : new Error(`${response.status} - ${message}`);
    }

    const data = (await response.json()) as T;
    return { data, headers: response.headers, status: response.status };
  }

  private async buildHeaders(headers?: HeadersInit): Promise<Record<string, string>> {
    const out: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.normalizeHeaders(headers),
    };

    if (this.tokenSource) {
      const token = await this.tokenSource.getAccessToken();
      out.Authorization = `Bearer ${token}`;
    }

    return out;
  }

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }
    return headers;
  }
}
