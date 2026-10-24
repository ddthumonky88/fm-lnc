import { Module } from '@nestjs/common';
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
} from './entities';
import { LncModule } from './lnc/lnc.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { RecordsModule } from './records/records.module';
import { SearchModule } from './search/search.module';
import { LogosModule } from './logos/logos.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health.controller';


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
})
export class AppModule {}
