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

    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author || author.deletedAt) {
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
        where: { deletedAt: null },
        skip: offset,
        take: limit,
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where: { deletedAt: null } }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException(`Post #${id} introuvable`);
    }
    return post;
  }

  async update(id: number, dto: UpdatePostDto) {
    await this.findOne(id);
    const { categoryIds, authorId, ...rest } = dto;

    if (authorId !== undefined) {
      const author = await this.prisma.user.findUnique({ where: { id: authorId } });
      if (!author || author.deletedAt) {
        throw new NotFoundException(`Auteur #${authorId} introuvable`);
      }
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...rest,
        ...(authorId !== undefined && { author: { connect: { id: authorId } } }),
        ...(categoryIds !== undefined && {
          categories: { set: categoryIds.map((cid) => ({ id: cid })) },
        }),
      },
      include: POST_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: POST_INCLUDE,
    });
  }

  async findTrashed(pagination: PaginateDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { deletedAt: { not: null } },
        skip: offset,
        take: limit,
        include: POST_INCLUDE,
        orderBy: { deletedAt: 'desc' },
      }),
      this.prisma.post.count({ where: { deletedAt: { not: null } } }),
    ]);
    return { data, total, limit, offset };
  }

  async findOneTrashed(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post || !post.deletedAt) {
      throw new NotFoundException(`Post supprimé #${id} introuvable`);
    }
    return post;
  }

  async restore(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException(`Post #${id} introuvable`);
    if (!post.deletedAt) {
      throw new ConflictException(`Post #${id} n'est pas supprimé`);
    }
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: null },
      include: POST_INCLUDE,
    });
  }
}
