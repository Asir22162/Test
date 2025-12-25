import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { TextEncoder } from 'util';
import type { AuthPayload } from './types';
import { AuthError, TokenExpiredError } from './errors';

export type Algorithm = 'HS256' | 'RS256';

export interface JWTOptions {
  alg?: Algorithm;
  // HS256 密钥
  secret?: string;
  // RS256 私钥 PEM（签发时）与公钥 PEM（验证时）可选
  privateKey?: string;
  publicKey?: string;
  // 可插入自定义 KeyProvider（如 KMS）
  keyProvider?: {
    getPrivateKey?: () => Promise<string | undefined>;
    getPublicKey?: () => Promise<string | undefined>;
  };
  expiresIn?: string | number; // eg: '1h' or seconds
  issuer?: string;
  audience?: string;
}

async function getSigningKey(opts: JWTOptions) {
  const alg = opts.alg || 'HS256';
  if (alg === 'HS256') {
    if (!opts.secret) throw new AuthError('secret required for HS256');
    return new TextEncoder().encode(opts.secret);
  }

  // RS256
  const privateKey = opts.privateKey ?? await opts.keyProvider?.getPrivateKey?.();
  if (!privateKey) throw new AuthError('privateKey required for RS256');
  return await importPKCS8(privateKey, 'RS256');
}

async function getVerifyingKey(opts: JWTOptions) {
  const alg = opts.alg || 'HS256';
  if (alg === 'HS256') {
    if (!opts.secret) throw new AuthError('secret required for HS256');
    return new TextEncoder().encode(opts.secret);
  }

  const publicKey = opts.publicKey ?? await opts.keyProvider?.getPublicKey?.();
  if (!publicKey) throw new AuthError('publicKey required for RS256');
  return await importSPKI(publicKey, 'RS256');
}

export class JWT {
  private opts: JWTOptions;

  constructor(opts: JWTOptions) {
    this.opts = { alg: 'HS256', ...opts };
  }

  async sign(payload: AuthPayload): Promise<string> {
    const alg = this.opts.alg || 'HS256';
    const key = await getSigningKey(this.opts);
    const jwt = new SignJWT({ ...payload })
      .setProtectedHeader({ alg })
      .setIssuedAt();

    if (this.opts.expiresIn) {
      jwt.setExpirationTime(typeof this.opts.expiresIn === 'number' ? Math.floor(this.opts.expiresIn) : this.opts.expiresIn as string);
    }
    if (this.opts.issuer) jwt.setIssuer(this.opts.issuer);
    if (this.opts.audience) jwt.setAudience(this.opts.audience);

    return jwt.sign(key as any);
  }

  async verify(token: string): Promise<AuthPayload> {
    try {
      const key = await getVerifyingKey(this.opts);
      const { payload } = await jwtVerify(token, key as any, {
        issuer: this.opts.issuer,
        audience: this.opts.audience
      });
      return payload as unknown as AuthPayload;
    } catch (err: any) {
      if (err?.code === 'ERR_JWT_EXPIRED' || err?.message?.toLowerCase().includes('expired')) throw new TokenExpiredError();
      throw new AuthError(err?.message || 'Invalid token');
    }
  }
}

export const hasRole = (payload: AuthPayload, role: string) => {
  return Array.isArray(payload.roles) && payload.roles.includes(role);
};
