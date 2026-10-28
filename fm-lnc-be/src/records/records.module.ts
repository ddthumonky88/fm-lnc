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
  Region,
} from '../entities';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [
    HierarchyModule,
    TypeOrmModule.forFeature([
      Nation,
      City,
      Competition,
      Club,
      Stadium,
      Award,
      Person,
      Stage,
      Region,
    ]),
  ],
  providers: [RecordsService],
  controllers: [RecordsController],
  exports: [RecordsService],
})
export class RecordsModule {}
