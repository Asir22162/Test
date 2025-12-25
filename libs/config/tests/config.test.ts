import { describe, it, expect } from 'vitest';
import { ConfigService } from '../src/index';
import { StubRemoteProvider } from '../src/remoteProvider';

const schema = {
  parse(raw: Record<string, any>) {
    return {
      PORT: Number(raw.PORT ?? 3000),
      FEATURE_X: raw.FEATURE_X === 'true' || raw.FEATURE_X === true,
      NAME: String(raw.NAME ?? 'app')
    };
  }
};

describe('ConfigService', () => {
  it('loads env over remote', async () => {
    process.env.PORT = '4000';
    const remote = new StubRemoteProvider({ PORT: 2000, FEATURE_X: 'false' });
    const cfg = new ConfigService(schema as any, { remote, envPrefix: '' });
    const loaded = await cfg.load();
    expect(loaded.PORT).toBe(4000);
    expect(loaded.FEATURE_X).toBe(false);
    expect(loaded.NAME).toBe('app');
  });
});
