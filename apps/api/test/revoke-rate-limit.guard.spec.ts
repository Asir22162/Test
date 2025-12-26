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
      evalsha: async (_sha: string, numKeys: number, k: string, max: string, refill: string, now: string) => {
        store[k] = (store[k] || 0) + 1
        // simulate allowed until >5
        const allowed = store[k] <= 5 ? 1 : 0
        const tokens = Math.max(0, 5 - store[k])
        return [allowed, String(tokens), '0']
      },
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
      evalsha: async (_sha: string, numKeys: number, k: string, max: string, refill: string, now: string) => {
        store[k] = (store[k] || 0) + 1
        const allowed = store[k] <= 5 ? 1 : 0
        const tokens = Math.max(0, 5 - store[k])
        return [allowed, String(tokens), '0']
      },
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
