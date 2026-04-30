import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateDto } from './dto/paginate.dto';
import { ParamId, Paginate } from '../common/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Paginate() pagination: PaginateDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  findOne(@ParamId() id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@ParamId() id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@ParamId() id: number) {
    return this.usersService.remove(id);
  }

  @Patch(':id/restore')
  restore(@ParamId() id: number) {
    return this.usersService.restore(id);
  }
}
