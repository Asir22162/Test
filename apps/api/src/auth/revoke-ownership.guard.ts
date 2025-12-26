import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Request } from 'express'
import { JWT } from '@weapp/auth'
import { AppDataSource } from '../data-source'
import { TypeOrmRefreshStore } from '@weapp/auth'

@Injectable()
export class RevokeOwnershipGuard implements CanActivate {
  private jwt: JWT
  private store: TypeOrmRefreshStore

  constructor() {
    this.jwt = new JWT({ secret: process.env.AUTH_SECRET || 'dev-secret' })
    this.store = new TypeOrmRefreshStore(AppDataSource as any)
  }

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>()
    const user = (req as any).user
    if (!user) throw new ForbiddenException('Authentication required')

    const body = req.body || {}

    if (body.refreshToken) {
      try {
        const payload: any = await this.jwt.verify(body.refreshToken)
        if (String(payload.sub) === String(user.sub) || (user.roles && user.roles.includes('admin'))) return true
        throw new ForbiddenException('Cannot revoke token for another user')
      } catch (e) {
        throw new ForbiddenException('Invalid refresh token')
      }
    }

    if (body.jti) {
      const rec = await this.store.get(body.jti)
      if (!rec) {
        // allow admin to revoke unknown jti (audit), but normal users cannot
        if (user.roles && user.roles.includes('admin')) return true
        throw new ForbiddenException('Unknown token jti')
      }
      if (String(rec.sub) === String(user.sub) || (user.roles && user.roles.includes('admin'))) return true
      throw new ForbiddenException('Cannot revoke token for another user')
    }

    // no token specified
    throw new ForbiddenException('refreshToken or jti is required')
  }
}
