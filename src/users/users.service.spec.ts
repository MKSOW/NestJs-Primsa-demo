import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = {
  id: 1,
  firstname: 'Mamadou',
  lastname: 'Diallo',
  email: 'mamadou@test.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPrisma = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne un utilisateur', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const result = await service.create({
        firstname: 'Mamadou',
        lastname: 'Diallo',
        email: 'mamadou@test.com',
      });
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { firstname: 'Mamadou', lastname: 'Diallo', email: 'mamadou@test.com' },
      });
    });

    it('lève ConflictException si email déjà utilisé (P2002)', async () => {
      mockPrisma.user.create.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.create({ firstname: 'X', lastname: 'Y', email: 'mamadou@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('propage les autres erreurs Prisma', async () => {
      const err = new Error('DB down');
      mockPrisma.user.create.mockRejectedValue(err);
      await expect(
        service.create({ firstname: 'X', lastname: 'Y', email: 'x@y.com' }),
      ).rejects.toThrow('DB down');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne les utilisateurs actifs avec pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({ data: [mockUser], total: 1, limit: 10, offset: 0 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });

    it('utilise limit=10 et offset=0 par défaut', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.findAll({});
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne un utilisateur actif', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si utilisateur supprimé (soft delete)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour et retourne l\'utilisateur', async () => {
      const updated = { ...mockUser, firstname: 'Nouveau' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update(1, { firstname: 'Nouveau' });
      expect(result).toEqual(updated);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update(99, { firstname: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si email déjà pris (P2002)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.update(1, { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove()', () => {
    it('marque deletedAt au lieu de supprimer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── restore ──────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('remet deletedAt à null', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(deletedUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.restore(1);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: null },
      });
      expect(result).toEqual(mockUser);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.restore(99)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si utilisateur déjà actif', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // deletedAt: null
      await expect(service.restore(1)).rejects.toThrow(ConflictException);
    });
  });
});
