import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './helpers/app.helper';

describe('Posts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let categoryId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Crée un auteur et une catégorie réutilisables dans chaque test
    const user = await prisma.user.create({
      data: { firstname: 'Auteur', lastname: 'Test', email: 'auteur@test.com' },
    });
    const cat = await prisma.category.create({ data: { name: 'Tech' } });
    userId = user.id;
    categoryId = cat.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ─── POST /posts ──────────────────────────────────────────────────────────

  describe('POST /posts', () => {
    it('201 — crée un post avec auteur et catégories', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Mon article',
          content: 'Contenu de test',
          authorId: userId,
          categoryIds: [categoryId],
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Mon article',
        author: expect.objectContaining({ id: userId }),
        categories: expect.arrayContaining([
          expect.objectContaining({ id: categoryId }),
        ]),
        deletedAt: null,
      });
    });

    it('404 — auteur inexistant', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'Test post', content: 'Contenu', authorId: 999999 });

      expect(res.status).toBe(404);
    });

    it('400 — titre manquant', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({ content: 'Contenu', authorId: userId });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /posts ───────────────────────────────────────────────────────────

  describe('GET /posts', () => {
    it('200 — retourne seulement les posts actifs', async () => {
      await prisma.post.create({
        data: { title: 'Actif', content: 'Ca', authorId: userId },
      });
      await prisma.post.create({
        data: { title: 'Supprimé', content: 'Ca', authorId: userId, deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer()).get('/posts');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Actif');
    });
  });

  // ─── GET /posts/trash ─────────────────────────────────────────────────────

  describe('GET /posts/trash', () => {
    it('200 — retourne seulement les posts supprimés', async () => {
      await prisma.post.create({
        data: { title: 'Actif', content: 'Ca', authorId: userId },
      });
      await prisma.post.create({
        data: { title: 'Corbeille', content: 'Ca', authorId: userId, deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer()).get('/posts/trash');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Corbeille');
    });
  });

  // ─── GET /posts/:id ───────────────────────────────────────────────────────

  describe('GET /posts/:id', () => {
    it('200 — inclut auteur et catégories (jointures)', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Avec jointures',
          content: 'Ca',
          authorId: userId,
          categories: { connect: [{ id: categoryId }] },
        },
      });

      const res = await request(app.getHttpServer()).get(`/posts/${post.id}`);

      expect(res.status).toBe(200);
      expect(res.body.author).toBeDefined();
      expect(res.body.categories).toHaveLength(1);
    });

    it('404 — post supprimé invisible', async () => {
      const post = await prisma.post.create({
        data: { title: 'Ghost post', content: 'Ca', authorId: userId, deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer()).get(`/posts/${post.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /posts/:id ────────────────────────────────────────────────────

  describe('PATCH /posts/:id', () => {
    it('200 — met à jour le titre', async () => {
      const post = await prisma.post.create({
        data: { title: 'Ancien titre', content: 'Ca', authorId: userId },
      });

      const res = await request(app.getHttpServer())
        .patch(`/posts/${post.id}`)
        .send({ title: 'Nouveau titre' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Nouveau titre');
    });

    it('200 — remplace les catégories', async () => {
      const cat2 = await prisma.category.create({ data: { name: 'JavaScript' } });
      const post = await prisma.post.create({
        data: {
          title: 'Post catégories',
          content: 'Ca',
          authorId: userId,
          categories: { connect: [{ id: categoryId }] },
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/posts/${post.id}`)
        .send({ categoryIds: [cat2.id] });

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(1);
      expect(res.body.categories[0].id).toBe(cat2.id);
    });
  });

  // ─── Cycle soft delete / restore ─────────────────────────────────────────

  describe('Cycle soft delete / restore', () => {
    it('DELETE 200 → corbeille visible → RESTORE 200 → actif visible', async () => {
      const post = await prisma.post.create({
        data: { title: 'A supprimer', content: 'Ca', authorId: userId },
      });

      // Soft delete
      const del = await request(app.getHttpServer()).delete(`/posts/${post.id}`);
      expect(del.status).toBe(200);
      expect(del.body.deletedAt).not.toBeNull();

      // Visible dans /trash
      const trash = await request(app.getHttpServer()).get(`/posts/trash/${post.id}`);
      expect(trash.status).toBe(200);

      // Restauration
      const restore = await request(app.getHttpServer()).patch(`/posts/${post.id}/restore`);
      expect(restore.status).toBe(200);
      expect(restore.body.deletedAt).toBeNull();

      // Visible de nouveau dans /posts
      const active = await request(app.getHttpServer()).get(`/posts/${post.id}`);
      expect(active.status).toBe(200);
    });
  });
});
