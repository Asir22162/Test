import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  index() {
    return this.svc.findAll();
  }

  @Post()
  create(@Body('username') username: string) {
    return this.svc.create(username);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    const sub = req.user?.sub
    return { id: sub }
  }
}
