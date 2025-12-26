import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { JWT } from '@weapp/auth'
import { AuthService } from '@weapp/auth'
import { TypeOrmRefreshStore } from '@weapp/auth'
import { AppDataSource } from '../data-source'

@Injectable()
export class AuthServiceNest {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  private makeAuth() {
    const jwt = new JWT({ secret: process.env.AUTH_SECRET || 'dev-secret', expiresIn: '15m' })
    const store = new TypeOrmRefreshStore(AppDataSource as any)
    // attach metrics registry so auth service emits metrics
    const metrics = require('../metrics').authMetrics
    return new AuthService(jwt, { refreshTTLSeconds: 60 * 60 * 24 * 7, refreshStore: store, metricsRegistry: metrics })
  }

  async login(username: string) {
    let user = await this.repo.findOne({ where: { username } })
    if (!user) user = await this.repo.save(this.repo.create({ username }))
    const auth = this.makeAuth()
    return auth.issueTokens({ sub: String(user.id) }, '15m')
  }

  async refresh(refreshToken: string) {
    const auth = this.makeAuth()
    return auth.rotateRefresh(refreshToken)
  }

  async revoke(payload: { refreshToken?: string; jti?: string; reason?: string; revokedBy?: string }) {
    const auth = this.makeAuth()
    if (payload.refreshToken) {
      return auth.revokeByRefreshToken(payload.refreshToken, { revokedBy: payload.revokedBy, reason: payload.reason })
    }
    if (payload.jti) {
      return auth.revokeRefresh(payload.jti, { revokedBy: payload.revokedBy, reason: payload.reason })
    }
    throw new Error('Either refreshToken or jti is required')
  }
}
