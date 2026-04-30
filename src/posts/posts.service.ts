import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginateDto } from '../users/dto/paginate.dto';

const POST_INCLUDE = {
  author: {
    select: { id: true, firstname: true, lastname: true, email: true },
  },
  categories: {
    select: { id: true, name: true },
  },
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePostDto) {
    const { categoryIds, authorId, ...rest } = dto;

    const authorExists = await this.prisma.user.findUnique({
      where: { id: authorId },
    });
    if (!authorExists) {
      throw new NotFoundException(`Auteur #${authorId} introuvable`);
    }

    return this.prisma.post.create({
      data: {
        ...rest,
        author: { connect: { id: authorId } },
        categories: categoryIds?.length
          ? { connect: categoryIds.map((id) => ({ id })) }
          : undefined,
      },
      include: POST_INCLUDE,
    });
  }

  async findAll(pagination: PaginateDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        skip: offset,
        take: limit,
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count(),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException(`Post #${id} introuvable`);
    return post;
  }

  async update(id: number, dto: UpdatePostDto) {
    await this.findOne(id);
    const { categoryIds, authorId, ...rest } = dto;

    if (authorId !== undefined) {
      const authorExists = await this.prisma.user.findUnique({
        where: { id: authorId },
      });
      if (!authorExists) {
        throw new NotFoundException(`Auteur #${authorId} introuvable`);
      }
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...rest,
        ...(authorId !== undefined && { author: { connect: { id: authorId } } }),
        // set remplace toutes les catégories existantes par les nouvelles
        ...(categoryIds !== undefined && {
          categories: { set: categoryIds.map((cid) => ({ id: cid })) },
        }),
      },
      include: POST_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.post.delete({ where: { id }, include: POST_INCLUDE });
  }
}
