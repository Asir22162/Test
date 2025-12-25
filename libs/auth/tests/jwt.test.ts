import { describe, it, expect } from 'vitest';
import { JWT, hasRole } from '../src/jwt';

describe('JWT PoC', () => {
  it('signs and verifies payload', async () => {
    const jwt = new JWT({ secret: 'test-secret', expiresIn: '60' });
    const token = await jwt.sign({ sub: 'u1', roles: ['consumer'] as any });
    const payload = await jwt.verify(token);
    expect(payload.sub).toBe('u1');
    expect(payload.roles).toEqual(['consumer']);
  });

  it('detects roles', async () => {
    const jwt = new JWT({ secret: 'test-secret', expiresIn: '60' });
    const token = await jwt.sign({ sub: 'u2', roles: ['merchant'] as any });
    const payload = await jwt.verify(token);
    expect(hasRole(payload as any, 'merchant')).toBe(true);
    expect(hasRole(payload as any, 'admin')).toBe(false);
  });
});
