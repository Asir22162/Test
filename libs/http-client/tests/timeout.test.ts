import { describe, it, expect } from 'vitest';
import { HttpClient } from '../src/index';
import { createServer } from 'http';

describe('HttpClient timeout', () => {
  it('aborts request on timeout', async () => {
    const srv = createServer((req, res) => {
      // delay to trigger client timeout
      setTimeout(() => {
        res.statusCode = 200;
        res.end('ok');
      }, 200);
    });

    await new Promise<void>((resolve) => srv.listen(0, resolve));
    const port = (srv.address() as any).port;
    const client = new HttpClient(`http://127.0.0.1:${port}`);

    let threw = false;
    try {
      await client.request('/slow', { timeoutMs: 10 });
    } catch (err: any) {
      threw = true;
      expect(err.name).toMatch(/AbortError|.*timeout/i);
    }
    expect(threw).toBe(true);
    srv.close();
  });
});