import fetch, { RequestInit, Response } from 'node-fetch';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type AuthProvider = () => Promise<string | null | Record<string, string> | undefined>;

export type MetricsHooks = {
  onRequest?: (meta: { method: HttpMethod; path: string; attempt: number }) => void;
  onResponse?: (meta: { method: HttpMethod; path: string; status: number }) => void;
  onError?: (meta: { method: HttpMethod; path: string; error: any }) => void;
  onRetry?: (meta: { method: HttpMethod; path: string; attempt: number; delayMs: number }) => void;
};

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  retryOn?: (status?: number, err?: any) => boolean;
};

export type HttpClientOptions = RequestInit & {
  baseUrl?: string;
  authProvider?: AuthProvider;
  metrics?: MetricsHooks;
  retry?: RetryOptions;
  timeoutMs?: number;
  tracingHeaders?: () => Record<string, string> | undefined;
  fetchFn?: typeof fetch;
  circuit?: { onSuccess?: (info: any) => void; onFailure?: (info: any) => void };
};

export class HttpError extends Error {
  public status?: number;
  public body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function defaultRetryOn(status?: number, err?: any) {
  if (err) return true; // network errors
  if (!status) return false;
  return status === 429 || status >= 500;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export class HttpClient {
  private baseUrl: string;
  private authProvider?: AuthProvider;
  private metrics?: MetricsHooks;
  private retryOpts: RetryOptions;
  private timeoutMs: number;
  private tracingHeaders?: () => Record<string, string> | undefined;
  private fetchFn: typeof fetch;
  private circuit?: { onSuccess?: (info: any) => void; onFailure?: (info: any) => void };

  constructor(opts: HttpClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? '';
    this.authProvider = opts.authProvider;
    this.metrics = opts.metrics;
    this.retryOpts = { retries: 3, baseDelayMs: 200, jitterMs: 100, ...(opts.retry || {}) };
    this.timeoutMs = opts.timeoutMs ?? 5000;
    this.tracingHeaders = opts.tracingHeaders;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.circuit = opts.circuit;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.tracingHeaders) Object.assign(h, this.tracingHeaders() || {});
    if (this.authProvider) {
      try {
        const v = await this.authProvider();
        if (typeof v === 'string') {
          h['authorization'] = v;
        } else if (v && typeof v === 'object') {
          Object.assign(h, v);
        }
      } catch (e) {
        // ignore auth errors here; will fail on request
      }
    }
    return h;
  }

  private calcDelay(attempt: number) {
    const base = (this.retryOpts.baseDelayMs || 200) * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * (this.retryOpts.jitterMs || 0));
    return base + jitter;
  }

  private async request(path: string, method: HttpMethod, body?: any): Promise<any> {
    const attempts = (this.retryOpts.retries ?? 0) + 1;
    let lastErr: any;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        this.metrics?.onRequest?.({ method, path, attempt });
        const headers = await this.buildHeaders();
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), this.timeoutMs);
        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          body: body ? JSON.stringify(body) : undefined
        } as RequestInit;

        const res: Response = await this.fetchFn(this.baseUrl + path, init);
        clearTimeout(t);
        const text = await res.text();
        if (res.ok) {
          this.metrics?.onResponse?.({ method, path, status: res.status });
          this.circuit?.onSuccess?.({ method, path, status: res.status });
          try { return JSON.parse(text); } catch (e) { return text; }
        }

        const err = new HttpError('HTTP Error', res.status, text);
        if ((this.retryOpts.retryOn ?? defaultRetryOn)(res.status, undefined) && attempt < attempts) {
          const delayMs = this.calcDelay(attempt);
          this.metrics?.onRetry?.({ method, path, attempt, delayMs });
          await sleep(delayMs);
          continue;
        }

        this.metrics?.onError?.({ method, path, error: err });
        this.circuit?.onFailure?.({ method, path, status: res.status, body: text });
        throw err;
      } catch (e: any) {
        if (e.name === 'AbortError') e = new HttpError('Timeout');
        lastErr = e;
        if ((this.retryOpts.retryOn ?? defaultRetryOn)(undefined, e) && attempt < attempts) {
          const delayMs = this.calcDelay(attempt);
          this.metrics?.onRetry?.({ method, path, attempt, delayMs });
          await sleep(delayMs);
          continue;
        }
        this.metrics?.onError?.({ method, path, error: e });
        this.circuit?.onFailure?.({ method, path, error: e });
        throw e;
      }
    }

    throw lastErr;
  }

  get(path: string) { return this.request(path, 'GET'); }
  post(path: string, body: any) { return this.request(path, 'POST', body); }
  put(path: string, body: any) { return this.request(path, 'PUT', body); }
  delete(path: string) { return this.request(path, 'DELETE'); }
}
