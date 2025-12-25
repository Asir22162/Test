// Use global fetch if available (browser), otherwise node-fetch for Node
let fetchImpl: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fetchImpl = (globalThis as any).fetch ?? require('node-fetch');
} catch (e) {
  fetchImpl = (globalThis as any).fetch;
}

import type { RequestOptions, Signer } from './types';
import type { Response } from 'node-fetch';

export class HttpClient {
  constructor(private baseUrl: string, private signer?: Signer) {}

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private async doRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
    const method = (opts.method || 'GET').toUpperCase();
    const headers: Record<string, string> = opts.headers ? { ...opts.headers } : {};
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

    if (this.signer) {
      const s = await this.signer.sign(method, path, opts.body);
      Object.assign(headers, s.headers);
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);

    try {
      const res = await fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal
      });
      return res as Response;
    } finally {
      clearTimeout(id);
    }
  }

  async request(path: string, opts: RequestOptions = {}): Promise<Response> {
    const retries = opts.retries ?? 2;
    let attempt = 0;
    let lastErr: any;

    while (attempt <= retries) {
      try {
        const res = await this.doRequest(path, opts);
        if (!res.ok && res.status >= 500 && attempt < retries) {
          await this.delay(opts.retryDelayMs ?? 200);
          attempt++;
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await this.delay(opts.retryDelayMs ?? 200);
          attempt++;
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr;
  }
}
