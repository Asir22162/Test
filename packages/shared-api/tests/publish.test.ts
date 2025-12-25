import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import nock from 'nock';

const script = path.resolve(process.cwd(), 'packages/shared-api/scripts/publish-pacts.js');
const pactsDir = path.resolve(process.cwd(), 'packages/shared-api/pacts');
const resultFile = path.join(pactsDir, 'publish-results.json');

function runScript(env: Record<string, string> = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile('node', [script], { env: { ...process.env, ...env } }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

beforeEach(() => {
  // reset pacts dir and nock
  if (!fs.existsSync(pactsDir)) fs.mkdirSync(pactsDir, { recursive: true });
  // write a minimal example pact
  const pact = {
    consumer: { name: 'shared-api-consumer' },
    provider: { name: 'shared-api-provider' },
    interactions: [],
    metadata: { pactSpecification: { version: '3.0.0' } }
  };
  fs.writeFileSync(path.join(pactsDir, 'test-pact.json'), JSON.stringify(pact, null, 2));
  if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
  nock.cleanAll();
  nock.disableNetConnect();
});

afterEach(() => {
  nock.enableNetConnect();
});

describe('publish-pacts script', () => {
  it('publishes pact and tags successfully with token auth', async () => {
    const broker = 'http://broker.test';
    const version = 'abc123';
    const tag = 'test-branch';

    // intercept pact publish
    const publishPath = `/pacts/provider/${encodeURIComponent('shared-api-provider')}/consumer/${encodeURIComponent('shared-api-consumer')}/version/${encodeURIComponent(version)}`;
    nock(broker).post(publishPath).reply(201, 'ok');

    // intercept tag
    const tagPath = `/pacticipants/${encodeURIComponent('shared-api-consumer')}/versions/${encodeURIComponent(version)}/tags/${encodeURIComponent(tag)}`;
    nock(broker).put(tagPath).reply(200, 'tagged');

    await runScript({ PACT_BROKER_BASE_URL: broker, PACT_BROKER_TOKEN: 't', GITHUB_SHA: version, PACT_BROKER_TAGS: tag });

    const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    expect(result.version).toBe(version);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].ok).toBe(true);
    expect(result.results[0].tags).toHaveLength(1);
    expect(result.results[0].tags[0].ok).toBe(true);
  });

  it('uploads metadata with body strategy to custom endpoint', async () => {
    const broker = 'http://broker.test';
    const version = 'meta1';

    const publishPath = `/pacts/provider/${encodeURIComponent('shared-api-provider')}/consumer/${encodeURIComponent('shared-api-consumer')}/version/${encodeURIComponent(version)}`;
    nock(broker).post(publishPath).reply(201, 'ok');

    const metaEndpoint = '/custom/meta-endpoint';
    // expect wrapper body contains pact and metadata
    let seenWrapper = false;
    nock(broker)
      .post(metaEndpoint, (body) => {
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed.pact && parsed.metadata && parsed.metadata.env === 'staging') {
            seenWrapper = true;
            return true;
          }
        } catch (e) {}
        return false;
      })
      .reply(200, 'meta-ok');

    await runScript({
      PACT_BROKER_BASE_URL: broker,
      PACT_BROKER_TOKEN: 't',
      GITHUB_SHA: version,
      PACT_BROKER_METADATA: JSON.stringify({ env: 'staging' }),
      PACT_BROKER_METADATA_STRATEGY: 'body',
      PACT_BROKER_META_ENDPOINT: `${broker}${metaEndpoint}`
    });

    const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    expect(result.version).toBe(version);
    expect(result.results[0].metadata.body).toBeDefined();
    expect(result.results[0].metadata.body.ok).toBe(true);
    expect(seenWrapper).toBe(true);
  });

  it('fails when broker returns non-2xx', async () => {
    const broker = 'http://broker.test';
    const version = 'bad1';

    const publishPath = `/pacts/provider/${encodeURIComponent('shared-api-provider')}/consumer/${encodeURIComponent('shared-api-consumer')}/version/${encodeURIComponent(version)}`;
    nock(broker).post(publishPath).reply(500, 'boom');

    let threw = false;
    try {
      await runScript({ PACT_BROKER_BASE_URL: broker, PACT_BROKER_TOKEN: 't', GITHUB_SHA: version });
    } catch (err: any) {
      threw = true;
      // ensure publish-results.json exists and shows fail
      const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
      expect(result.results[0].ok).toBe(false);
    }
    expect(threw).toBe(true);
  });
});
