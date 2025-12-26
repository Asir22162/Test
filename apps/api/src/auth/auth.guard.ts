import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { JWT } from '@weapp/auth'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwt: JWT

  constructor() {
    this.jwt = new JWT({ secret: process.env.AUTH_SECRET || 'dev-secret' })
  }

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>()
    const h = req.headers['authorization'] || ''
    const m = String(h).match(/^Bearer\s+(.+)$/i)
    if (!m) throw new UnauthorizedException('Missing Authorization header')
    const token = m[1]
    try {
      const payload = await this.jwt.verify(token)
      ;(req as any).user = payload
      return true
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
