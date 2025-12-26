import { JWT } from './jwt'
import { InMemoryRefreshStore, RefreshStore, RefreshTokenRecord } from './refresh'
import crypto from 'node:crypto'

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export class AuthService {
  private jwt: JWT
  private refreshStore: RefreshStore
  private refreshTTL: number

  constructor(jwt: JWT, opts?: { refreshStore?: RefreshStore; refreshTTLSeconds?: number; metricsRegistry?: { inc: (name: string, v?: number) => void } }) {
    this.jwt = jwt
    this.refreshStore = opts?.refreshStore ?? new InMemoryRefreshStore()
    this.refreshTTL = (opts?.refreshTTLSeconds ?? 60 * 60 * 24 * 7) // 7 days
    this.metrics = opts?.metricsRegistry
  }

  private genJti() {
    return crypto.randomBytes(16).toString('hex')
  }

  async issueTokens(payload: Record<string, any>, accessExpiresIn: number | string = '15m') {
    const accessToken = await this.jwt.sign(payload, accessExpiresIn)
    const jti = this.genJti()
    const expiresAt = Date.now() + this.refreshTTL * 1000
    const refreshPayload = { jti, sub: payload.sub }
    const refreshToken = await this.jwt.sign(refreshPayload, `${this.refreshTTL}s`)
    const rec: RefreshTokenRecord = { jti, sub: payload.sub, expiresAt }
    await this.refreshStore.save(rec)
    try { this.metrics?.inc('auth_issue_count') } catch (e) {}
    return { accessToken, refreshToken }
  }

  async rotateRefresh(oldRefreshToken: string) {
    // verify old refresh token and the jti
    try {
      const payload = await this.jwt.verify(oldRefreshToken)
      const jti = (payload as any).jti
      if (!jti) throw new Error('Invalid refresh token: missing jti')
      const rec = await this.refreshStore.get(jti)
      if (!rec || rec.revoked) throw new Error('Invalid refresh token')

      // revoke old
      await this.refreshStore.revoke(jti)

      // issue new pair
      const pair = await this.issueTokens({ sub: rec.sub })
      try { this.metrics?.inc('auth_rotate_count') } catch (e) {}
      return pair
    } catch (e) {
      try { this.metrics?.inc('auth_rotate_failures') } catch (e) {}
      throw e
    }
  }

  async revokeRefresh(jti: string, opts?: { revokedBy?: string; reason?: string }) {
    try {
      await (this.refreshStore as any).revoke(jti, opts)
      try { this.metrics?.inc('auth_revoke_count') } catch (e) {}
    } catch (e) {
      try { this.metrics?.inc('auth_revoke_failures') } catch (e) {}
      throw e
    }
  }

  async revokeByRefreshToken(refreshToken: string, opts?: { revokedBy?: string; reason?: string }) {
    try {
      const payload = await this.jwt.verify(refreshToken)
      const jti = (payload as any).jti
      if (!jti) throw new Error('Invalid refresh token: missing jti')
      await this.revokeRefresh(jti, opts)
    } catch (e) {
      try { this.metrics?.inc('auth_revoke_failures') } catch (e) {}
      throw e
    }
  }
}
