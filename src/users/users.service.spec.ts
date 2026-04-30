import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  setupTestDb,
  teardownTestDb,
  cleanDatabase,
  TestContext,
} from '../test/db.helper';

describe('UsersService (real DB)', () => {
  let ctx: TestContext;
  let service: UsersService;

  beforeAll(async () => {
    ctx = await setupTestDb();
    service = ctx.module.get<UsersService>(UsersService);
  }, 120_000);

  afterAll(() => teardownTestDb(ctx));

  beforeEach(() => cleanDatabase(ctx.prisma));

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne un utilisateur', async () => {
      const result = await service.create({
        firstname: 'Mamadou',
        lastname: 'Diallo',
        email: 'mamadou@test.com',
      });
      expect(result.email).toBe('mamadou@test.com');
      expect(result.firstname).toBe('Mamadou');
      expect(result.id).toBeDefined();
      expect(result.deletedAt).toBeNull();
    });

    it('lève ConflictException si email déjà utilisé (contrainte réelle)', async () => {
      await service.create({ firstname: 'A', lastname: 'B', email: 'dup@test.com' });
      await expect(
        service.create({ firstname: 'C', lastname: 'D', email: 'dup@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne les utilisateurs actifs avec pagination', async () => {
      await service.create({ firstname: 'Alice', lastname: 'A', email: 'alice@test.com' });
      await service.create({ firstname: 'Bob', lastname: 'B', email: 'bob@test.com' });

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('exclut les utilisateurs soft-supprimés du compte', async () => {
      const user = await service.create({ firstname: 'Alice', lastname: 'A', email: 'alice@test.com' });
      await service.remove(user.id);

      const result = await service.findAll({});
      expect(result.total).toBe(0);
    });

    it('utilise limit=10 et offset=0 par défaut', async () => {
      const result = await service.findAll({});
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne un utilisateur actif', async () => {
      const created = await service.create({
        firstname: 'Mamadou',
        lastname: 'Diallo',
        email: 'mamadou@test.com',
      });
      const found = await service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si utilisateur soft-supprimé', async () => {
      const user = await service.create({ firstname: 'X', lastname: 'Y', email: 'x@test.com' });
      await service.remove(user.id);
      await expect(service.findOne(user.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour et retourne l\'utilisateur', async () => {
      const user = await service.create({ firstname: 'Ancien', lastname: 'Nom', email: 'u@test.com' });
      const updated = await service.update(user.id, { firstname: 'Nouveau' });
      expect(updated.firstname).toBe('Nouveau');
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(service.update(99999, { firstname: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si email déjà pris (contrainte réelle)', async () => {
      const u1 = await service.create({ firstname: 'A', lastname: 'A', email: 'taken@test.com' });
      const u2 = await service.create({ firstname: 'B', lastname: 'B', email: 'free@test.com' });
      await expect(
        service.update(u2.id, { email: u1.email }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove()', () => {
    it('marque deletedAt sans supprimer la ligne', async () => {
      const user = await service.create({ firstname: 'A', lastname: 'B', email: 'del@test.com' });
      await service.remove(user.id);

      // La ligne existe encore en base, mais avec deletedAt renseigné
      const raw = await ctx.prisma.user.findUnique({ where: { id: user.id } });
      expect(raw).not.toBeNull();
      expect(raw!.deletedAt).not.toBeNull();
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(service.remove(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── restore ──────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('remet deletedAt à null', async () => {
      const user = await service.create({ firstname: 'A', lastname: 'B', email: 'r@test.com' });
      await service.remove(user.id);
      const restored = await service.restore(user.id);
      expect(restored.deletedAt).toBeNull();
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      await expect(service.restore(99999)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si utilisateur déjà actif', async () => {
      const user = await service.create({ firstname: 'A', lastname: 'B', email: 'active@test.com' });
      await expect(service.restore(user.id)).rejects.toThrow(ConflictException);
    });
  });
});
