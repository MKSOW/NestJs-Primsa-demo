import { execSync } from 'child_process';
import path from 'path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { TestingModule, Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { CategoriesModule } from '../categories/categories.module';

/**
 * Démarre un vrai conteneur PostgreSQL via Testcontainers, applique toutes les
 * migrations Prisma, et retourne un module NestJS de test entièrement câblé.
 *
 * Pourquoi sans mocks ?
 * Les règles métier comme ConflictException (email dupliqué) ou les contraintes
 * uniques ne se déclenchent qu'au niveau de la base de données. Un repository
 * mocké retourne ce qu'on lui dit — il ne peut jamais détecter qu'on a
 * accidentellement retiré une contrainte du schéma. Tester contre une vraie BDD
 * garantit le comportement réel.
 *
 * Appeler teardownTestDb() dans afterAll pour stopper le conteneur.
 */

export interface TestContext {
  module: TestingModule;
  prisma: PrismaService;
  container: StartedPostgreSqlContainer;
}

export async function setupTestDb(): Promise<TestContext> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('nestdb_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const url = container.getConnectionUri();

  // Doit être défini avant que NestJS démarre pour que PrismaService le récupère
  process.env.DATABASE_URL = url;

  // __dirname = <project>/src/test  →  project root = ../..
  const projectRoot = path.resolve(__dirname, '../..');

  // Applique toutes les migrations sur le conteneur vierge
  execSync('npx prisma migrate deploy', {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });

  const module = await Test.createTestingModule({
    imports: [PrismaModule, UsersModule, PostsModule, CategoriesModule],
  }).compile();

  const prisma = module.get<PrismaService>(PrismaService);

  return { module, prisma, container };
}

export async function teardownTestDb(ctx: TestContext): Promise<void> {
  await ctx.module.close();
  await ctx.container.stop();
}

/**
 * Tronque toutes les tables entre les tests pour garantir l'isolation.
 * L'ordre respecte les contraintes FK :
 *   Post référence User (authorId) → supprimer les posts avant les users
 *   _CategoryToPost référence Post et Category (CASCADE) → géré automatiquement
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.post.deleteMany(),
    prisma.user.deleteMany(),
    prisma.category.deleteMany(),
  ]);
}
