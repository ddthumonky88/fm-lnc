import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend (origin: true phản chiếu origin gọi tới, tương thích cả localhost và IP LAN)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

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
