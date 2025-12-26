import { describe, it, expect } from 'vitest'
import { JWT } from '../src/jwt'
import { AuthService } from '../src/service'

describe('AuthService refresh rotation', () => {
  it('issues tokens and rotates refresh token', async () => {
    const jwt = new JWT({ secret: 'test-secret', expiresIn: '1h' })
    const auth = new AuthService(jwt, { refreshTTLSeconds: 60 })
    const pair = await auth.issueTokens({ sub: 'u1' }, '1m')
    expect(pair.accessToken).toBeDefined()
    expect(pair.refreshToken).toBeDefined()

    const pair2 = await auth.rotateRefresh(pair.refreshToken)
    expect(pair2.accessToken).toBeDefined()
    expect(pair2.refreshToken).toBeDefined()
    expect(pair2.refreshToken).not.toBe(pair.refreshToken)
  })

  it('revokes refresh token', async () => {
    const jwt = new JWT({ secret: 'test-secret', expiresIn: '1h' })
    const auth = new AuthService(jwt, { refreshTTLSeconds: 60 })
    const pair = await auth.issueTokens({ sub: 'u2' }, '1m')
    const payload = await jwt.verify(pair.refreshToken)
    const jti = (payload as any).jti
    await auth.revokeRefresh(jti)
    try {
      await auth.rotateRefresh(pair.refreshToken)
      throw new Error('should have thrown')
    } catch (e: any) {
      expect(e.message).toMatch(/Invalid refresh token/)
    }
  })
})