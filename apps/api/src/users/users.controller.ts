import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

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
}
