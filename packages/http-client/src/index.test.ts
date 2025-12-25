import { describe, it, expect } from 'vitest';
const nock = require('nock');
import { HttpClient, HttpError } from './index';

describe('HttpClient', () => {
  it('performs GET and parses JSON', async () => {
    const api = nock('https://api.example').get('/hello').reply(200, { ok: true });
    const c = new HttpClient('https://api.example');
    const res = await c.get('/hello');
    expect(res.ok).toBe(true);
    expect(api.isDone()).toBe(true);
  });

  it('retries on failure then succeeds', async () => {
    const scope = nock('https://api.example')
      .get('/retry')
      .reply(500, 'err')
      .get('/retry')
      .reply(200, { ok: true });
    const c = new HttpClient('https://api.example', { retries: 2, retryDelay: 10, timeout: 1000 });
    const res = await c.get('/retry');
    expect(res.ok).toBe(true);
    expect(scope.isDone()).toBe(true);
  });

  it('throws on timeout', async () => {
    const scope = nock('https://api.example')
      .get('/slow')
      .delay(200)
      .reply(200, { ok: true });
    const c = new HttpClient('https://api.example', { retries: 1, retryDelay: 10, timeout: 50 });
    await expect(c.get('/slow')).rejects.toThrow();
    expect(scope.isDone()).toBe(true);
  });
});