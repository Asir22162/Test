import { describe, it, expect } from 'vitest';
import { Logger } from '../src/index';
import { JsonBackend } from '../src/backends';

describe('Logger', () => {
  it('logs with json backend', () => {
    const logger = new Logger({ service: 'test', sampleRate: 1, backend: new JsonBackend() });
    // ensure no throw
    logger.info('hello', { user: 'u1' } as any);
    expect(true).toBe(true);
  });
});
