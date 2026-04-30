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
      this.prisma.user.findMany({ skip: offset, take: limit }),
      this.prisma.user.count(),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} introuvable`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
