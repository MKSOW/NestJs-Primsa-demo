import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateDto } from './dto/paginate.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({ data: dto });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw e;
    }
  }

  async findAll(pagination: PaginateDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip: offset,
        take: limit,
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User #${id} introuvable`);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    try {
      return await this.prisma.user.update({ where: { id }, data: dto });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} introuvable`);
    if (!user.deletedAt) {
      throw new ConflictException(`User #${id} n'est pas supprimé`);
    }
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
