import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginateDto } from '../users/dto/paginate.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginateDto) {
    return this.postsService.findAll(pagination);
  }

  // Doit être AVANT @Get(':id') — sinon NestJS interprète "trash" comme un id
  @Get('trash')
  findTrashed(@Query() pagination: PaginateDto) {
    return this.postsService.findTrashed(pagination);
  }

  @Get('trash/:id')
  findOneTrashed(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOneTrashed(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.remove(id);
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.restore(id);
  }
}
