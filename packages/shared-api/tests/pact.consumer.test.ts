import path from 'path';
import { Pact } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const pactDir = path.resolve(process.cwd(), 'packages/shared-api/pacts');

describe('Pact consumer (shared-api)', () => {
  it('creates pact for POST /orders', async () => {
    const provider = new Pact({
      consumer: 'shared-api-consumer',
      provider: 'shared-api-provider',
      port: 0, // let pact pick an available port
      dir: pactDir,
      log: path.resolve(process.cwd(), 'packages/shared-api/pacts/pact.log')
    });

    await provider.setup();

    await provider.addInteraction({
      state: 'provider accepts a new order',
      uponReceiving: 'a request to create an order',
      withRequest: {
        method: 'POST',
        path: '/orders',
        headers: { 'Content-Type': 'application/json' },
        body: { productId: 'p1', quantity: 1 }
      },
      willRespondWith: {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { id: 'o1', productId: 'p1', quantity: 1, status: 'created' }
      }
    });

    const baseUrl = provider.mockService.baseUrl || `http://127.0.0.1:${(provider as any).opts.port}`;
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      body: JSON.stringify({ productId: 'p1', quantity: 1 }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.productId).toBe('p1');

    await provider.verify();
    await provider.finalize();
  });
});