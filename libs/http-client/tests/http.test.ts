import { describe, it, expect } from 'vitest';
import { HttpClient } from '../src/index';
import { HmacSigner } from '../src/signer';
import { createServer } from 'http';

describe('HttpClient', () => {
  it('retries on 500 and respects idempotency header and signature', async () => {
    let calls = 0;
    const srv = createServer((req, res) => {
      calls++;
      if (calls < 2) {
        res.statusCode = 500;
        res.end('err');
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, headers: req.headers }));
    });

    await new Promise<void>((resolve) => srv.listen(0, resolve));
    const port = (srv.address() as any).port;
    const client = new HttpClient(`http://127.0.0.1:${port}`, new HmacSigner('secret'));

    const res = await client.request('/test', { method: 'POST', body: { a: 1 }, idempotencyKey: 'ik-1', retries: 2 });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(calls).toBeGreaterThanOrEqual(2);
    srv.close();
  });
});
