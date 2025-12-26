import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common'
import { Request } from 'express'
import { getRedisClient } from '../redis.client'

const WINDOW_SECONDS = Number(process.env.REVOKE_RATE_LIMIT_WINDOW_SECONDS || 60) // seconds
const MAX_REQUESTS = Number(process.env.REVOKE_RATE_LIMIT_MAX || 5)

@Injectable()
export class RevokeRateLimitGuard implements CanActivate {
  private redis: any

  constructor(redisClient?: any) {
    // for testability, allow injecting a redis client
    this.redis = redisClient ?? getRedisClient()
  }

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>()
    const user = (req as any).user
    const keyBase = user?.sub ? `user:${user.sub}` : `ip:${req.ip}`
    const key = `rate:revoke:${keyBase}`

    // If no redis configured, fallback to in-memory window
    if (!this.redis) {
      // simple in-memory fallback (not distributed)
      const now = Date.now()
      ;(RevokeRateLimitGuard as any)._buckets = (RevokeRateLimitGuard as any)._buckets || new Map()
      const buckets: Map<string, { count: number; expiresAt: number }> = (RevokeRateLimitGuard as any)._buckets
      const b = buckets.get(key)
      if (!b || b.expiresAt < now) {
        buckets.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 })
        return true
      }
      if (b.count >= MAX_REQUESTS) throw new TooManyRequestsException('Rate limit exceeded')
      b.count += 1
      buckets.set(key, b)
      return true
    }

    try {
      // INCR the counter and set expiry if first
      const n = await this.redis.incr(key)
      if (n === 1) {
        await this.redis.expire(key, WINDOW_SECONDS)
      }
      if (n > MAX_REQUESTS) throw new TooManyRequestsException('Rate limit exceeded')
      return true
    } catch (e) {
      // On Redis errors, fallback to allowing requests (fail-open) but log
      console.error('Redis rate limiter error:', e?.message || e)
      return true
    }
  }
}
