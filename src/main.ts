import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Monter BetterAuth AVANT les pipes et routes NestJS
  // Toutes les requêtes vers /api/auth/* sont interceptées par BetterAuth
  const httpAdapter = app.getHttpAdapter();
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
