import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  // 1. Configure Swagger Document Builder
  const config = new DocumentBuilder()
    .setTitle('LedgerStream API')
    .setDescription('Core financial ledger and transaction processing API documentation')
    .setVersion('1.0')
    .build();

  // 2. Create Document and Setup Swagger UI endpoint
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Accessible at /api

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api`);
}
void bootstrap();
