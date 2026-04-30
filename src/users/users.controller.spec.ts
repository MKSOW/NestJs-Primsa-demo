import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import {
  setupTestDb,
  teardownTestDb,
  cleanDatabase,
  TestContext,
} from '../test/db.helper';

describe('UsersController (real DB)', () => {
  let ctx: TestContext;
  let controller: UsersController;

  beforeAll(async () => {
    ctx = await setupTestDb();
    controller = ctx.module.get<UsersController>(UsersController);
  }, 120_000);

  afterAll(() => teardownTestDb(ctx));

  beforeEach(() => cleanDatabase(ctx.prisma));

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne un utilisateur', async () => {
      const result = await controller.create({
        firstname: 'Mamadou',
        lastname: 'Diallo',
        email: 'mamadou@test.com',
      });
      expect(result.email).toBe('mamadou@test.com');
      expect(result.firstname).toBe('Mamadou');
      expect(result.id).toBeDefined();
    });

    it('lève ConflictException si email déjà utilisé (contrainte réelle)', async () => {
      await controller.create({ firstname: 'A', lastname: 'B', email: 'dup@test.com' });
      await expect(
        controller.create({ firstname: 'C', lastname: 'D', email: 'dup@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne la liste paginée des utilisateurs actifs', async () => {
      await controller.create({ firstname: 'Alice', lastname: 'A', email: 'alice@test.com' });
      await controller.create({ firstname: 'Bob', lastname: 'B', email: 'bob@test.com' });

      const result = await controller.findAll({ limit: 10, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('exclut les utilisateurs soft-supprimés', async () => {
      const user = await controller.create({ firstname: 'A', lastname: 'B', email: 'del@test.com' });
      await controller.remove(user.id);

      const result = await controller.findAll({});
      expect(result.total).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne un utilisateur actif par son ID', async () => {
      const created = await controller.create({
        firstname: 'Alice',
        lastname: 'A',
        email: 'alice@test.com',
      });
      const found = await controller.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(controller.findOne(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si utilisateur soft-supprimé', async () => {
      const user = await controller.create({ firstname: 'X', lastname: 'Y', email: 'x@test.com' });
      await controller.remove(user.id);
      await expect(controller.findOne(user.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it("met à jour et retourne l'utilisateur", async () => {
      const user = await controller.create({ firstname: 'Ancien', lastname: 'Nom', email: 'u@test.com' });
      const updated = await controller.update(user.id, { firstname: 'Nouveau' });
      expect(updated.firstname).toBe('Nouveau');
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(controller.update(99999, { firstname: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si email déjà pris (contrainte réelle)', async () => {
      const u1 = await controller.create({ firstname: 'A', lastname: 'A', email: 'taken@test.com' });
      const u2 = await controller.create({ firstname: 'B', lastname: 'B', email: 'free@test.com' });
      await expect(
        controller.update(u2.id, { email: u1.email }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove()', () => {
    it('marque deletedAt sans supprimer la ligne', async () => {
      const user = await controller.create({ firstname: 'A', lastname: 'B', email: 'del@test.com' });
      await controller.remove(user.id);

      const raw = await ctx.prisma.user.findUnique({ where: { id: user.id } });
      expect(raw).not.toBeNull();
      expect(raw!.deletedAt).not.toBeNull();
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(controller.remove(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── restore ──────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('remet deletedAt à null', async () => {
      const user = await controller.create({ firstname: 'A', lastname: 'B', email: 'r@test.com' });
      await controller.remove(user.id);
      const restored = await controller.restore(user.id);
      expect(restored.deletedAt).toBeNull();
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(controller.restore(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si utilisateur déjà actif', async () => {
      const user = await controller.create({ firstname: 'A', lastname: 'B', email: 'active@test.com' });
      await expect(controller.restore(user.id)).rejects.toThrow(ConflictException);
    });
  });
});
