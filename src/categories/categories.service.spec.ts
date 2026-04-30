import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  setupTestDb,
  teardownTestDb,
  cleanDatabase,
  TestContext,
} from '../test/db.helper';

describe('CategoriesService (real DB)', () => {
  let ctx: TestContext;
  let service: CategoriesService;

  beforeAll(async () => {
    ctx = await setupTestDb();
    service = ctx.module.get<CategoriesService>(CategoriesService);
  }, 120_000);

  afterAll(() => teardownTestDb(ctx));

  beforeEach(() => cleanDatabase(ctx.prisma));

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne une catégorie', async () => {
      const result = await service.create({ name: 'Tech' });
      expect(result.name).toBe('Tech');
      expect(result.id).toBeDefined();
      expect(result.posts).toEqual([]);
    });

    it('lève ConflictException si nom déjà utilisé (contrainte réelle)', async () => {
      await service.create({ name: 'Tech' });
      await expect(service.create({ name: 'Tech' })).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne les catégories paginées', async () => {
      await service.create({ name: 'Backend' });
      await service.create({ name: 'Frontend' });

      const result = await service.findAll({ limit: 5, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
    });

    it('utilise limit=10 et offset=0 par défaut', async () => {
      const result = await service.findAll({});
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne la catégorie', async () => {
      const created = await service.create({ name: 'DevOps' });
      const found = await service.findOne(created.id);
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('DevOps');
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour le nom', async () => {
      const cat = await service.create({ name: 'Ancien' });
      const updated = await service.update(cat.id, { name: 'Nouveau' });
      expect(updated.name).toBe('Nouveau');
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      await expect(service.update(99999, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si nom déjà utilisé (contrainte réelle)', async () => {
      const c1 = await service.create({ name: 'Pris' });
      const c2 = await service.create({ name: 'Libre' });
      await expect(service.update(c2.id, { name: c1.name })).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('supprime définitivement la catégorie', async () => {
      const cat = await service.create({ name: 'À supprimer' });
      await service.remove(cat.id);

      // La ligne doit avoir disparu de la base
      const raw = await ctx.prisma.category.findUnique({ where: { id: cat.id } });
      expect(raw).toBeNull();
    });

    it('lève NotFoundException si catégorie inexistante', async () => {
      await expect(service.remove(99999)).rejects.toThrow(NotFoundException);
    });
  });
});
