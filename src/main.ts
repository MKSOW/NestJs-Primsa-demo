import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const httpAdapter = app.getHttpAdapter();

  // Middleware CORS + Origin pour toutes les routes BetterAuth
  // Doit être placé AVANT toNodeHandler pour intercepter les preflight OPTIONS
  httpAdapter.use('/api/auth', (req: any, res: any, next: () => void) => {
    const requestOrigin = req.headers['origin'];

    // Répond au preflight CORS avec l'origine de la requête
    // "null" = requête depuis file:// (ouverture d'un fichier HTML local)
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Preflight OPTIONS : on répond directement sans passer à BetterAuth
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Si Origin est absent (Postman, curl) ou "null" (file://),
    // on injecte une origine valide pour le contrôle CSRF de BetterAuth
    if (!requestOrigin || requestOrigin === 'null') {
      req.headers['origin'] = process.env.BETTER_AUTH_URL ?? 'http://localhost:3003';
    }

    next();
  });

  httpAdapter.use('/api/auth', toNodeHandler(auth));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
