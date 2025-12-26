import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common'
import { Request } from 'express'

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 5

const buckets = new Map<string, { count: number; expiresAt: number }>()

@Injectable()
export class RevokeRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>()
    const user = (req as any).user
    const key = user?.sub ? `user:${user.sub}` : `ip:${req.ip}`

    const now = Date.now()
    const b = buckets.get(key)
    if (!b || b.expiresAt < now) {
      buckets.set(key, { count: 1, expiresAt: now + WINDOW_MS })
      return true
    }

    if (b.count >= MAX_REQUESTS) {
      throw new TooManyRequestsException('Rate limit exceeded')
    }

    b.count += 1
    buckets.set(key, b)
    return true
  }
}
