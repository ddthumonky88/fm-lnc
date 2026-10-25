import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import {
  Confederation,
  Nation,
  City,
  Competition,
  Club,
  Stadium,
  Award,
  Person,
  Stage,
  Region,
} from './entities';
import { LncModule } from './lnc/lnc.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { RecordsModule } from './records/records.module';
import { SearchModule } from './search/search.module';
import { LogosModule } from './logos/logos.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health.controller';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';


dotenv.config();

@Module({
  imports: [
    ConfigModule,
    LogosModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'fm_lnc_db',
      entities: [
        Confederation,
        Nation,
        City,
        Competition,
        Club,
        Stadium,
        Award,
        Person,
        Stage,
        Region,
      ],
      synchronize: false, // We created schema and seeded directly
      logging: false,
    }),
    LncModule,
    HierarchyModule,
    RecordsModule,
    SearchModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
