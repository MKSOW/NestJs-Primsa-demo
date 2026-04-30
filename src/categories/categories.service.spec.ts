import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

const mockCategory = {
  id: 1,
  name: 'Tech',
  posts: [],
};

const mockPrisma = {
  category: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne une catégorie', async () => {
      mockPrisma.category.create.mockResolvedValue(mockCategory);
      const result = await service.create({ name: 'Tech' });
      expect(result).toEqual(mockCategory);
      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Tech' } }),
      );
    });

    it('lève ConflictException si nom déjà utilisé (P2002)', async () => {
      mockPrisma.category.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.create({ name: 'Tech' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne les catégories paginées', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      mockPrisma.category.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 5, offset: 0 });

      expect(result).toEqual({ data: [mockCategory], total: 1, limit: 5, offset: 0 });
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne la catégorie', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      const result = await service.findOne(1);
      expect(result).toEqual(mockCategory);
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour le nom', async () => {
      const updated = { ...mockCategory, name: 'Backend' };
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Backend' });
      expect(result).toEqual(updated);
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.update(99, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si nom déjà utilisé (P2002)', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockRejectedValue({ code: 'P2002' });
      await expect(service.update(1, { name: 'Existant' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('supprime définitivement la catégorie', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.delete.mockResolvedValue(mockCategory);

      const result = await service.remove(1);
      expect(result).toEqual(mockCategory);
      expect(mockPrisma.category.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
