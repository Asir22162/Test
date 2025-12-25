import { describe, it, expect } from 'vitest';
import { loadConfig } from './index';

describe('packages/config', () => {
  it('loads default config', () => {
    const cfg = loadConfig();
    expect(cfg.env).toBeDefined();
    expect(typeof cfg.port).toBe('number');
  });
});