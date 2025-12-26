import { Controller, Post, Body } from '@nestjs/common'
import { AuthServiceNest } from './auth.service'

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
  async revoke(@Body() body: { refreshToken?: string; jti?: string; reason?: string; revokedBy?: string }) {
    return this.svc.revoke(body)
  }
}
