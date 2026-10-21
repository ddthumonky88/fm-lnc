import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Nation,
  City,
  Competition,
  Club,
  Stadium,
  Award,
  Person,
  Stage,
} from '../entities';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Nation,
      City,
      Competition,
      Club,
      Stadium,
      Award,
      Person,
      Stage,
    ]),
  ],
  providers: [RecordsService],
  controllers: [RecordsController],
  exports: [RecordsService],
})
export class RecordsModule {}
