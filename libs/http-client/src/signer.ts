import crypto from 'crypto';
import type { Signer } from './types';

export class HmacSigner implements Signer {
  constructor(private secret: string) {}

  async sign(method: string, path: string, body?: any) {
    const payload = `${method.toUpperCase()}|${path}|${body ? JSON.stringify(body) : ''}`;
    const sig = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    return { headers: { 'x-signature': sig } };
  }
}
