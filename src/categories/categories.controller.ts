import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginateDto } from '../users/dto/paginate.dto';
import { ParamId, Paginate } from '../common/decorators';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll(@Paginate() pagination: PaginateDto) {
    return this.categoriesService.findAll(pagination);
  }

  @Get(':id')
  findOne(@ParamId() id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(@ParamId() id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@ParamId() id: number) {
    return this.categoriesService.remove(id);
  }
}
