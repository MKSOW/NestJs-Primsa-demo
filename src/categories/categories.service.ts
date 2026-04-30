import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginateDto } from '../users/dto/paginate.dto';

const CATEGORY_INCLUDE = {
  posts: {
    select: {
      id: true,
      title: true,
      published: true,
      author: {
        select: { id: true, firstname: true, lastname: true },
      },
    },
  },
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: dto,
        include: CATEGORY_INCLUDE,
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ce nom de catégorie est déjà utilisé');
      }
      throw e;
    }
  }

  async findAll(pagination: PaginateDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        skip: offset,
        take: limit,
        include: CATEGORY_INCLUDE,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count(),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
    if (!category) throw new NotFoundException(`Catégorie #${id} introuvable`);
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: dto,
        include: CATEGORY_INCLUDE,
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ce nom de catégorie est déjà utilisé');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.category.delete({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
  }
}
