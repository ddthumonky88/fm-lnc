import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Confederation,
  Nation,
  Competition,
  Club,
  Stadium,
  City,
  Award,
  Person,
  Stage,
  Region,
} from '../entities';
import { HierarchyService } from './hierarchy.service';
import { HierarchyController } from './hierarchy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Confederation,
      Nation,
      Competition,
      Club,
      Stadium,
      City,
      Award,
      Person,
      Stage,
      Region,
    ]),
  ],
  providers: [HierarchyService],
  controllers: [HierarchyController],
  exports: [HierarchyService],
})
export class HierarchyModule {}
