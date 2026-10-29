import { Controller, Get, Post, Res, Body, Query, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
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
import { RawResponse } from '../common/raw-response.decorator';

@ApiTags('LNC')
@Controller(['api/lnc', 'api/fm'])
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

  @ApiOperation({ summary: 'Xuất dữ liệu toàn bộ ra file định dạng .LNC' })
  @ApiQuery({ name: 'download', required: false, description: 'Nếu là true thì download file attachment' })
  @ApiOkResponse({
    description: 'Nội dung file .LNC (plain text UTF-8)',
    schema: {
      type: 'string',
      example: '"NATION_LONG_NAME_CHANGE" 560 "Việt Nam" 8\n"COMP_LONG_NAME_CHANGE" 11 "English Premier Division" ""',
    },
  })
  @RawResponse()
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

  @ApiOperation({ summary: 'Import dữ liệu từ file .lnc trên server' })
  @ApiBody({ schema: { type: 'object', properties: { dir: { type: 'string', description: 'Đường dẫn thư mục lnc (tùy chọn)' } } } })
  @ApiOkResponse({
    description: 'Kết quả import các file .lnc vào cơ sở dữ liệu',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Successfully imported .lnc files into database' },
        stats: { type: 'object' },
      },
      example: {
        success: true,
        message: 'string',
        stats: {
          confederations: 0,
          nations: 0,
          cities: 0,
          competitions: 0,
          clubs: 0,
          stadiums: 0,
          awards: 0,
          people: 0,
          stages: 0,
        },
      },
    },
  })
  @Post('import')
  async importLnc(@Body('dir') dir?: string) {
    await this.lncParserService.parseAndSeed(dir);
    return {
      success: true,
      message: 'Successfully imported .lnc files into database',
      stats: await this.getStatus(),
    };
  }

  @ApiOperation({ summary: 'Tải trực tiếp các file .lnc từ máy lên và nạp vào database' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Kết quả upload và parse file .lnc',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'string' },
        uploadedFiles: { type: 'array', items: { type: 'string' }, example: ['string'] },
        stats: { type: 'object' },
      },
    },
  })
  @Post('upload')
  async uploadLncFiles(@Body('files') files: { name: string; content: string }[]) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('Không tìm thấy file nào để tải lên');
    }

    const targetDir = this.lncParserService.getBaseDir();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const writtenFiles: string[] = [];
    for (const f of files) {
      if (!f.name || !f.content) continue;
      const safeName = path.basename(f.name);
      const filePath = path.resolve(targetDir, safeName);
      fs.writeFileSync(filePath, f.content, 'utf8');
      writtenFiles.push(safeName);
    }

    // Auto-seed
    await this.lncParserService.parseAndSeed(targetDir);

    return {
      success: true,
      message: `Đã nạp thành công ${writtenFiles.length} file .LNC vào database!`,
      uploadedFiles: writtenFiles,
      stats: await this.getStatus(),
    };
  }

  @ApiOperation({ summary: 'Thống kê số lượng bản ghi trong database' })
  @ApiOkResponse({
    description: 'Số lượng bản ghi hiện có trong từng bảng dữ liệu của PostgreSQL',
    schema: {
      type: 'object',
      example: {
        confederations: 7,
        nations: 250,
        cities: 13408,
        competitions: 2731,
        clubs: 6604,
        stadiums: 3762,
        awards: 1180,
        people: 8900,
        stages: 12,
      },
    },
  })
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
