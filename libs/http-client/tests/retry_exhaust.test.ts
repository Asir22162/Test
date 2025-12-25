import { describe, it, expect } from 'vitest';
import { HttpClient } from '../src/index';
import { createServer } from 'http';

describe('HttpClient retry exhaustion', () => {
  it('throws after retries exhausted', async () => {
    const srv = createServer((req, res) => {
      res.statusCode = 500;
      res.end('server error');
    });

    await new Promise<void>((resolve) => srv.listen(0, resolve));
    const port = (srv.address() as any).port;
    const client = new HttpClient(`http://127.0.0.1:${port}`);

    let threw = false;
    try {
      await client.request('/always500', { method: 'GET', retries: 1, retryDelayMs: 1 });
    } catch (err) {
      threw = true;
    }
    expect(threw).toBe(true);
    srv.close();
  });
});