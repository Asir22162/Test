import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { AuthController } from './auth.controller'
import { AuthServiceNest } from './auth.service'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthServiceNest],
})
export class AuthModule {}
