import { Controller, Get, Post, Res, Body, Query, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LncService } from './lnc.service';
import { LncParserService } from './lnc-parser.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Nation,
  City,
  Competition,
  Club,
  Stadium,
  Award,
  Person,
  Stage,
  Confederation,
} from '../entities';
import { Repository } from 'typeorm';

@Controller('api/lnc')
export class LncController {
  constructor(
    private readonly lncService: LncService,
    private readonly lncParserService: LncParserService,
    @InjectRepository(Confederation) private confedRepo: Repository<Confederation>,
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
  ) {}

  @Get('export')
  async exportLnc(@Res() res: Response, @Query('download') download?: string) {
    const content = await this.lncService.exportLnc();
    if (download === 'true') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="FM24_Merged_Names.lnc"');
      return res.send(content);
    }
    return res.status(HttpStatus.OK).send(content);
  }

  @Post('import')
  async importLnc(@Body('dir') dir?: string) {
    await this.lncParserService.parseAndSeed(dir);
    return {
      success: true,
      message: 'Successfully imported .lnc files into database',
      stats: await this.getStatus(),
    };
  }

  @Get('status')
  async getStatus() {
    const [
      confederations,
      nations,
      cities,
      competitions,
      clubs,
      stadiums,
      awards,
      people,
      stages,
    ] = await Promise.all([
      this.confedRepo.count(),
      this.nationRepo.count(),
      this.cityRepo.count(),
      this.compRepo.count(),
      this.clubRepo.count(),
      this.stadiumRepo.count(),
      this.awardRepo.count(),
      this.personRepo.count(),
      this.stageRepo.count(),
    ]);

    return {
      confederations,
      nations,
      cities,
      competitions,
      clubs,
      stadiums,
      awards,
      people,
      stages,
    };
  }
}
