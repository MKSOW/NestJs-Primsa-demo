import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginateDto } from '../users/dto/paginate.dto';
import { ParamId, Paginate, CurrentUser } from '../common/decorators';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePostDto, @CurrentUser() user: any) {
    return this.postsService.create(dto, user.id);
  }

  @Get()
  findAll(@Paginate() pagination: PaginateDto) {
    return this.postsService.findAll(pagination);
  }

  @Get('trash')
  findTrashed(@Paginate() pagination: PaginateDto) {
    return this.postsService.findTrashed(pagination);
  }

  @Get('trash/:id')
  findOneTrashed(@ParamId() id: number) {
    return this.postsService.findOneTrashed(id);
  }

  @Get(':id')
  findOne(@ParamId() id: number) {
    return this.postsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @ParamId() id: number,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: any,
  ) {
    return this.postsService.update(id, dto, user.id, user.role);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@ParamId() id: number, @CurrentUser() user: any) {
    return this.postsService.remove(id, user.id, user.role);
  }

  @Patch(':id/restore')
  restore(@ParamId() id: number) {
    return this.postsService.restore(id);
  }
}
