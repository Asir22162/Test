import fetch, { RequestInit, Response } from 'node-fetch';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type HttpOptions = RequestInit & {
  retries?: number;
  retryDelay?: number; // ms base
  timeout?: number; // ms
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

export class HttpClient {
  constructor(private baseUrl = '', private defaultOpts: HttpOptions = { retries: 3, retryDelay: 500, timeout: 5000 }) {}

  private async doRequest(path: string, method: HttpMethod, body?: any, opts: HttpOptions = {}): Promise<any> {
    const merged: HttpOptions = { ...this.defaultOpts, ...opts };
    const attempts = merged.retries ?? 0;
    let lastErr: any;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = merged.timeout;
        const t = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
        const headers = { 'content-type': 'application/json', ...(merged.headers as any) };
        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          body: body ? JSON.stringify(body) : undefined
        };
        const res: Response = await fetch(this.baseUrl + path, init);
        if (t) clearTimeout(t);
        const text = await res.text();
        if (res.ok) {
          try { return JSON.parse(text); } catch (e) { return text; }
        }
        lastErr = new HttpError('HTTP Error', res.status, text);
        if (attempt < attempts) await this.delay(merged.retryDelay ?? 100 * attempt);
      } catch (e: any) {
        lastErr = e;
        if (e.name === 'AbortError') lastErr = new HttpError('Timeout');
        if (attempt < attempts) await this.delay(merged.retryDelay ?? 100 * attempt);
      }
    }
    throw lastErr;
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  get(path: string, opts?: HttpOptions) { return this.doRequest(path, 'GET', undefined, opts); }
  post(path: string, body: any, opts?: HttpOptions) { return this.doRequest(path, 'POST', body, opts); }
  put(path: string, body: any, opts?: HttpOptions) { return this.doRequest(path, 'PUT', body, opts); }
  delete(path: string, opts?: HttpOptions) { return this.doRequest(path, 'DELETE', undefined, opts); }
}
