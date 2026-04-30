import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './helpers/app.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ─── POST /users ──────────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('201 — crée un utilisateur valide', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Mamadou', lastname: 'Diallo', email: 'mamadou@test.com' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        firstname: 'Mamadou',
        lastname: 'Diallo',
        email: 'mamadou@test.com',
        deletedAt: null,
      });
    });

    it('201 — les espaces sont trimmés (@Trim)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: '  Fatou  ', lastname: '  Sow  ', email: 'fatou@test.com' });

      expect(res.status).toBe(201);
      expect(res.body.firstname).toBe('Fatou');
      expect(res.body.lastname).toBe('Sow');
    });

    it('409 — email déjà utilisé', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Alice', lastname: 'Ba', email: 'double@test.com' });

      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Charlie', lastname: 'Da', email: 'double@test.com' });

      expect(res.status).toBe(409);
    });

    it('400 — champ manquant (email absent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Mamadou', lastname: 'Diallo' });

      expect(res.status).toBe(400);
    });

    it('400 — email invalide', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Mamadou', lastname: 'Diallo', email: 'pasunemail' });

      expect(res.status).toBe(400);
    });

    it('400 — champ inconnu rejeté (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ firstname: 'Mamadou', lastname: 'Diallo', email: 'x@test.com', role: 'admin' });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /users ───────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('200 — retourne la liste paginée', async () => {
      await prisma.user.create({
        data: { firstname: 'Alice', lastname: 'Ba', email: 'alice@test.com' },
      });
      await prisma.user.create({
        data: { firstname: 'Bob', lastname: 'Ba', email: 'bob@test.com' },
      });

      const res = await request(app.getHttpServer()).get('/users');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });

    it('200 — n\'inclut pas les utilisateurs supprimés (soft delete)', async () => {
      await prisma.user.create({
        data: {
          firstname: 'Ghost',
          lastname: 'Ga',
          email: 'ghost@test.com',
          deletedAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer()).get('/users');

      expect(res.body.total).toBe(0);
    });

    it('200 — respecte la pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await prisma.user.create({
          data: { firstname: `User${i}`, lastname: 'Xa', email: `user${i}@test.com` },
        });
      }

      const res = await request(app.getHttpServer()).get('/users?limit=2&offset=1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.limit).toBe(2);
      expect(res.body.offset).toBe(1);
    });
  });

  // ─── GET /users/:id ───────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('200 — retourne l\'utilisateur', async () => {
      const user = await prisma.user.create({
        data: { firstname: 'Remi', lastname: 'Ra', email: 'remi@test.com' },
      });

      const res = await request(app.getHttpServer()).get(`/users/${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('remi@test.com');
    });

    it('404 — utilisateur inexistant', async () => {
      const res = await request(app.getHttpServer()).get('/users/999999');
      expect(res.status).toBe(404);
    });

    it('400 — id non entier', async () => {
      const res = await request(app.getHttpServer()).get('/users/abc');
      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /users/:id ─────────────────────────────────────────────────────

  describe('PATCH /users/:id', () => {
    it('200 — mise à jour partielle', async () => {
      const user = await prisma.user.create({
        data: { firstname: 'Ancien', lastname: 'La', email: 'ancien@test.com' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .send({ firstname: 'Nouveau' });

      expect(res.status).toBe(200);
      expect(res.body.firstname).toBe('Nouveau');
      expect(res.body.lastname).toBe('La');
    });

    it('404 — utilisateur inexistant', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/999999')
        .send({ firstname: 'Inconnu' });
      expect(res.status).toBe(404);
    });
  });

  // ─── Cycle soft delete / restore ─────────────────────────────────────────

  describe('Cycle soft delete / restore', () => {
    it('DELETE 200 → GET 404 → RESTORE 200 → GET 200', async () => {
      const user = await prisma.user.create({
        data: { firstname: 'Temp', lastname: 'Ta', email: 'temp@test.com' },
      });

      // Soft delete
      const delRes = await request(app.getHttpServer()).delete(`/users/${user.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.deletedAt).not.toBeNull();

      // GET doit retourner 404
      const getRes = await request(app.getHttpServer()).get(`/users/${user.id}`);
      expect(getRes.status).toBe(404);

      // Restauration
      const restoreRes = await request(app.getHttpServer()).patch(`/users/${user.id}/restore`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.deletedAt).toBeNull();

      // GET doit de nouveau retourner 200
      const getAfter = await request(app.getHttpServer()).get(`/users/${user.id}`);
      expect(getAfter.status).toBe(200);
    });

    it('409 — restore sur un utilisateur déjà actif', async () => {
      const user = await prisma.user.create({
        data: { firstname: 'Active', lastname: 'Ac', email: 'active@test.com' },
      });

      const res = await request(app.getHttpServer()).patch(`/users/${user.id}/restore`);
      expect(res.status).toBe(409);
    });
  });
});
