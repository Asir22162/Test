import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { AuthServiceNest } from './auth.service'
import { JwtAuthGuard } from './auth.guard'
import { RevokeOwnershipGuard } from './revoke-ownership.guard'
import { RevokeRateLimitGuard } from './revoke-rate-limit.guard'

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthServiceNest) {}

  @Post('login')
  async login(@Body('username') username: string) {
    return this.svc.login(username)
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.svc.refresh(refreshToken)
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard, RevokeOwnershipGuard, RevokeRateLimitGuard)
  async revoke(@Body() body: { refreshToken?: string; jti?: string; reason?: string; revokedBy?: string }) {
    return this.svc.revoke(body)
  }
}
