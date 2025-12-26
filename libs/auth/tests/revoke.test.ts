import { describe, it, expect } from 'vitest'
import { JWT } from '../src/jwt'
import { AuthService } from '../src/service'

describe('AuthService revoke flow', () => {
  it('revokes by refresh token and prevents rotation', async () => {
    const jwt = new JWT({ secret: 'test-secret' })
    const auth = new AuthService(jwt, { refreshTTLSeconds: 60 })

    const pair = await auth.issueTokens({ sub: 'user1' }, '15m')
    expect(pair.refreshToken).toBeDefined()

    // revoke by refresh token
    await auth.revokeByRefreshToken(pair.refreshToken, { revokedBy: 'tester', reason: 'unit-test' })

    // rotation should now fail
    try {
      await auth.rotateRefresh(pair.refreshToken)
      throw new Error('rotateRefresh should have thrown')
    } catch (e: any) {
      expect(e.message).toMatch(/Invalid refresh token/)
    }
  })
})
