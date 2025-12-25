import { describe, it, expect } from 'vitest';
import { JWT } from '../src/jwt';

// Test RSA keypair (2048) for unit tests only.
// In production, keys should be stored in secure KMS and rotation applied.
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
-----END PUBLIC KEY-----`;

describe('JWT RS256 PoC', () => {
  it('signs and verifies with RS256', async () => {
    const jwt = new JWT({ alg: 'RS256', privateKey: PRIVATE_KEY, publicKey: PUBLIC_KEY, expiresIn: '60' });
    const token = await jwt.sign({ sub: 'rsa1', roles: ['merchant'] as any });
    const payload = await jwt.verify(token);
    expect(payload.sub).toBe('rsa1');
    expect(payload.roles).toEqual(['merchant']);
  });
});
