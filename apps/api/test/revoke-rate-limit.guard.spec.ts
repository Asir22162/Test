import { describe, it, expect } from 'vitest'
import { RevokeRateLimitGuard } from '../src/auth/revoke-rate-limit.guard'
import { ExecutionContext } from '@nestjs/common'

function makeCtx(userSub?: string, ip = '1.2.3.4', body = {}) {
  return ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, body, ip, user: userSub ? { sub: userSub } : undefined })
    })
  } as unknown) as ExecutionContext
}

describe('RevokeRateLimitGuard (unit)', () => {
  it('allows below limit using redis mock', async () => {
    let store: Record<string, number> = {}
    const mockRedis = {
      incr: async (k: string) => {
        store[k] = (store[k] || 0) + 1
        return store[k]
      },
      expire: async () => true
    }

    const guard = new RevokeRateLimitGuard(mockRedis)

    const ctx = makeCtx('u1')
    for (let i = 0; i < 5; i++) {
      const ok = await guard.canActivate(ctx)
      expect(ok).toBe(true)
    }
  })

  it('blocks when above limit using redis mock', async () => {
    let store: Record<string, number> = {}
    const mockRedis = {
      incr: async (k: string) => {
        store[k] = (store[k] || 0) + 1
        return store[k]
      },
      expire: async () => true
    }

    const guard = new RevokeRateLimitGuard(mockRedis)
    const ctx = makeCtx('u2')
    for (let i = 0; i < 5; i++) await guard.canActivate(ctx)
    let blocked = false
    try {
      await guard.canActivate(ctx)
    } catch (e: any) {
      blocked = e?.name === 'TooManyRequestsException'
    }
    expect(blocked).toBe(true)
  })
})
