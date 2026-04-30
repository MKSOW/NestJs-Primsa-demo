import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAuthor = {
  id: 1,
  firstname: 'Mamadou',
  lastname: 'Diallo',
  email: 'mamadou@test.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPost = {
  id: 1,
  title: 'Mon article',
  content: 'Contenu ici',
  published: false,
  authorId: 1,
  author: { id: 1, firstname: 'Mamadou', lastname: 'Diallo', email: 'mamadou@test.com' },
  categories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPrisma = {
  user: { findUnique: jest.fn() },
  post: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée un post si l\'auteur existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAuthor);
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create({
        title: 'Mon article',
        content: 'Contenu',
        authorId: 1,
      });

      expect(result).toEqual(mockPost);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lève NotFoundException si auteur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: 'X', content: 'Y', authorId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si auteur soft-supprimé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockAuthor,
        deletedAt: new Date(),
      });
      await expect(
        service.create({ title: 'X', content: 'Y', authorId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('ne retourne que les posts actifs', async () => {
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({ data: [mockPost], total: 1, limit: 10, offset: 0 });
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });
  });

  // ─── findTrashed ──────────────────────────────────────────────────────────

  describe('findTrashed()', () => {
    it('ne retourne que les posts supprimés', async () => {
      const deleted = { ...mockPost, deletedAt: new Date() };
      mockPrisma.post.findMany.mockResolvedValue([deleted]);
      mockPrisma.post.count.mockResolvedValue(1);

      await service.findTrashed({ limit: 10, offset: 0 });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: { not: null } } }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne le post s\'il est actif', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      const result = await service.findOne(1);
      expect(result).toEqual(mockPost);
    });

    it('lève NotFoundException si post inexistant', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si post supprimé', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockPost,
        deletedAt: new Date(),
      });
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOneTrashed ───────────────────────────────────────────────────────

  describe('findOneTrashed()', () => {
    it('retourne le post supprimé', async () => {
      const deleted = { ...mockPost, deletedAt: new Date() };
      mockPrisma.post.findUnique.mockResolvedValue(deleted);
      const result = await service.findOneTrashed(1);
      expect(result).toEqual(deleted);
    });

    it('lève NotFoundException si le post n\'est pas supprimé', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost); // deletedAt: null
      await expect(service.findOneTrashed(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove()', () => {
    it('marque deletedAt sans supprimer la ligne', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.post.update.mockResolvedValue({ ...mockPost, deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  // ─── restore ──────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('remet deletedAt à null', async () => {
      const deleted = { ...mockPost, deletedAt: new Date() };
      mockPrisma.post.findUnique.mockResolvedValue(deleted);
      mockPrisma.post.update.mockResolvedValue(mockPost);

      await service.restore(1);

      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: null } }),
      );
    });

    it('lève NotFoundException si post inexistant', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);
      await expect(service.restore(99)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si post déjà actif', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      await expect(service.restore(1)).rejects.toThrow(ConflictException);
    });
  });
});
