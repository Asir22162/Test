import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { JWT } from '@weapp/auth'
import { AuthService } from '@weapp/auth'

@Injectable()
export class AuthServiceNest {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async login(username: string) {
    let user = await this.repo.findOne({ where: { username } })
    if (!user) user = await this.repo.save(this.repo.create({ username }))
    const jwt = new JWT({ secret: process.env.AUTH_SECRET || 'dev-secret', expiresIn: '15m' })
    const auth = new AuthService(jwt, { refreshTTLSeconds: 60 * 60 * 24 * 7 })
    return auth.issueTokens({ sub: String(user.id) }, '15m')
  }

  async refresh(refreshToken: string) {
    const jwt = new JWT({ secret: process.env.AUTH_SECRET || 'dev-secret', expiresIn: '15m' })
    const auth = new AuthService(jwt, { refreshTTLSeconds: 60 * 60 * 24 * 7 })
    return auth.rotateRefresh(refreshToken)
  }
}
