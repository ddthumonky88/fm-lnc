import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import * as os from 'os';
import { runStartupMigrations } from './database/startup-migrations';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Run automated startup migrations (ensure schema & parent_id logic are up to date on any environment)
  try {
    const dataSource = app.get(DataSource);
    await runStartupMigrations(dataSource, logger);
  } catch (err) {
    logger.error('Failed to run startup migrations:', err);
  }

  // Enable CORS for frontend (origin: true phản chiếu origin gọi tới, tương thích cả localhost và IP LAN)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ─── Swagger ────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('FM LNC Manager API')
    .setDescription(
      'REST API để quản lý và khám phá dữ liệu file .LNC (Language/Name Change) cho Football Manager 2024.\n\n' +
      '**Các nhóm API:**\n' +
      '- **Hierarchy**: Truy vấn cấu trúc phân cấp (Confederation → Nation → Competition → Club)\n' +
      '- **Records**: CRUD cho từng entity\n' +
      '- **Search**: Tìm kiếm toàn văn\n' +
      '- **LNC**: Export/Import file .lnc\n' +
      '- **Logos**: Serve logo từ filesystem FM'
    )
    .setVersion('1.0')
    .addTag('Hierarchy', 'Truy vấn cấu trúc phân cấp dữ liệu')
    .addTag('Records', 'CRUD cho các entity (Nation, Club, Competition...)')
    .addTag('Search', 'Tìm kiếm toàn văn')
    .addTag('LNC', 'Export/Import file .lnc')
    .addTag('Logos', 'Serve file logo')
    .addTag('Health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: -1,
    },
    customSiteTitle: 'FM LNC Manager API Docs',
  };
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);
  SwaggerModule.setup('api/docs', app, document, swaggerCustomOptions);
  // ────────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT || 3001;
  const host = process.env.HOST;
  if (host && host !== '0.0.0.0') {
    await app.listen(port, host);
  } else {
    try {
      await app.listen(port, '::');
    } catch {
      await app.listen(port, '0.0.0.0');
    }
  }

  logger.log(`FM .LNC Backend is running at:`);
  logger.log(`  - Local:   http://localhost:${port}`);
  logger.log(`  - Swagger: http://localhost:${port}/docs`);

  const networkInterfaces = os.networkInterfaces();
  Object.values(networkInterfaces).forEach((interfaces) => {
    interfaces?.forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        logger.log(`  - Network: http://${iface.address}:${port}`);
      }
    });
  });
}

bootstrap();
