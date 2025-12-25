import path from 'path';
import { Verifier } from '@pact-foundation/pact';
import express from 'express';
import bodyParser from 'body-parser';
import { describe, it } from 'vitest';

const pactFile = path.resolve(process.cwd(), 'packages/shared-api/pacts/shared-api-consumer-shared-api-provider.json');

describe('Pact provider verification (PoC)', () => {
  it('verifies provider against generated pact', async () => {
    const app = express();
    app.use(bodyParser.json());

    // Simple provider behavior that matches consumer expectations in the PoC
    app.post('/orders', (req, res) => {
      const { productId, quantity } = req.body || {};
      res.status(201).json({ id: 'o1', productId, quantity, status: 'created' });
    });

    const srv = app.listen(0);
    await new Promise<void>((resolve) => srv.once('listening', resolve));
    const port = (srv.address() as any).port;

    const opts = {
      providerBaseUrl: `http://127.0.0.1:${port}`,
      pactUrls: [pactFile],
      provider: 'shared-api-provider'
    } as any;

    // If PACT_BROKER_BASE_URL is set, also verify broker pacts (use broker as source)
    if (process.env.PACT_BROKER_BASE_URL) {
      console.log('Verifying provider pacts from Broker:', process.env.PACT_BROKER_BASE_URL);
      await new Verifier().verifyProvider({
        providerBaseUrl: `http://127.0.0.1:${port}`,
        pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
        provider: 'shared-api-provider',
        pactBrokerToken: process.env.PACT_BROKER_TOKEN
      } as any);
    } else {
      await new Verifier().verifyProvider(opts);
    }

    srv.close();
  });
});