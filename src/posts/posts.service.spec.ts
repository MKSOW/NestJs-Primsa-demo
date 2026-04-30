import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { UsersService } from '../users/users.service';
import {
  setupTestDb,
  teardownTestDb,
  cleanDatabase,
  TestContext,
} from '../test/db.helper';

describe('PostsService (real DB)', () => {
  let ctx: TestContext;
  let service: PostsService;
  let usersService: UsersService;

  beforeAll(async () => {
    ctx = await setupTestDb();
    service = ctx.module.get<PostsService>(PostsService);
    usersService = ctx.module.get<UsersService>(UsersService);
  }, 120_000);

  afterAll(() => teardownTestDb(ctx));

  beforeEach(() => cleanDatabase(ctx.prisma));

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée un post si l\'auteur existe', async () => {
      const author = await usersService.create({ firstname: 'Alice', lastname: 'A', email: 'alice@test.com' });
      const post = await service.create({ title: 'Mon article', content: 'Contenu', authorId: author.id });

      expect(post.id).toBeDefined();
      expect(post.title).toBe('Mon article');
      expect(post.author.id).toBe(author.id);
      expect(post.deletedAt).toBeNull();
    });

    it('lève NotFoundException si auteur inexistant', async () => {
      await expect(
        service.create({ title: 'X', content: 'Y', authorId: 99999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si auteur soft-supprimé', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'del@test.com' });
      await usersService.remove(author.id);
      await expect(
        service.create({ title: 'X', content: 'Y', authorId: author.id }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('ne retourne que les posts actifs', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      await service.create({ title: 'Actif', content: 'C', authorId: author.id });
      const deleted = await service.create({ title: 'Supprimé', content: 'C', authorId: author.id });
      await service.remove(deleted.id);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('Actif');
    });

    it('retourne la pagination correcte', async () => {
      const result = await service.findAll({ limit: 5, offset: 0 });
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
    });
  });

  // ─── findTrashed ──────────────────────────────────────────────────────────

  describe('findTrashed()', () => {
    it('ne retourne que les posts soft-supprimés', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      await service.create({ title: 'Actif', content: 'C', authorId: author.id });
      const toDelete = await service.create({ title: 'Supprimé', content: 'C', authorId: author.id });
      await service.remove(toDelete.id);

      const result = await service.findTrashed({ limit: 10, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('Supprimé');
      expect(result.data[0].deletedAt).not.toBeNull();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne le post s\'il est actif', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });

      const found = await service.findOne(post.id);
      expect(found.id).toBe(post.id);
    });

    it('lève NotFoundException si post inexistant', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si post soft-supprimé', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });
      await service.remove(post.id);

      await expect(service.findOne(post.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOneTrashed ───────────────────────────────────────────────────────

  describe('findOneTrashed()', () => {
    it('retourne le post supprimé', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });
      await service.remove(post.id);

      const found = await service.findOneTrashed(post.id);
      expect(found.id).toBe(post.id);
      expect(found.deletedAt).not.toBeNull();
    });

    it('lève NotFoundException si le post n\'est pas supprimé', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });

      await expect(service.findOneTrashed(post.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove()', () => {
    it('marque deletedAt sans supprimer la ligne', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });

      await service.remove(post.id);

      const raw = await ctx.prisma.post.findUnique({ where: { id: post.id } });
      expect(raw).not.toBeNull();
      expect(raw!.deletedAt).not.toBeNull();
    });
  });

  // ─── restore ──────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('remet deletedAt à null', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });
      await service.remove(post.id);

      const restored = await service.restore(post.id);
      expect(restored.deletedAt).toBeNull();
    });

    it('lève NotFoundException si post inexistant', async () => {
      await expect(service.restore(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si post déjà actif', async () => {
      const author = await usersService.create({ firstname: 'A', lastname: 'B', email: 'a@test.com' });
      const post = await service.create({ title: 'Test', content: 'C', authorId: author.id });

      await expect(service.restore(post.id)).rejects.toThrow(ConflictException);
    });
  });
});
