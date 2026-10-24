import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
} from '../entities';
import { LncService } from './lnc.service';
import { LncParserService } from './lnc-parser.service';
import { LncController } from './lnc.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Confederation,
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
  providers: [LncService, LncParserService],
  controllers: [LncController],
  exports: [LncService, LncParserService],
})
export class LncModule {}
