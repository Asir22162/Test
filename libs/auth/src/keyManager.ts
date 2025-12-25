import type { JWTOptions } from './jwt';

export interface KeyProvider {
  getPrivateKey?: () => Promise<string | undefined>;
  getPublicKey?: () => Promise<string | undefined>;
}

export class EnvKeyProvider implements KeyProvider {
  private opts: JWTOptions;

  constructor(opts: JWTOptions) {
    this.opts = opts;
  }

  async getPrivateKey() {
    return this.opts.privateKey;
  }

  async getPublicKey() {
    return this.opts.publicKey;
  }
}

export class StubKmsProvider implements KeyProvider {
  // PoC stub: in prod replace with actual KMS integration
  async getPrivateKey() {
    throw new Error('KMS provider not configured');
  }
  async getPublicKey() {
    throw new Error('KMS provider not configured');
  }
}
