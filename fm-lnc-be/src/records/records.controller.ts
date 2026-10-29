import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { RecordsService, RecordType } from './records.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';

@ApiTags('Records')
@Controller('api/records')
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  @ApiOperation({ summary: 'Lấy thông tin chi tiết kèm quan hệ và số liệu của 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity (confederation, nation, comp, club, city, award, stadium)' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết đầy đủ của thực thể kèm relation và counts',
    schema: {
      type: 'object',
      example: {
        id: '676',
        name_lg: 'Liverpool Football Club',
        name_sh: 'Liverpool',
        name_6l: "L'pool",
        name_3l: 'LIV',
        nation_id: '11',
        comp_id: '11',
        is_extinct: false,
        competition_name: 'Premier League',
        nation_name: 'England',
        nation_three_letter: 'ENG',
        nation: { id: '11', name_lg: 'England', name_sh: 'England', name_3l: 'ENG' },
        competition: { id: '11', name_lg: 'English Premier Division', name_sh: 'Premier League', name_3l: 'PL' },
      },
    },
  })
  @Get(':type/:id/info')
  getInfo(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.hierarchyService.getEntityInfo(type, id);
  }

  @ApiOperation({ summary: 'Lấy chi tiết 1 bản ghi thô từ CSDL' })
  @ApiParam({ name: 'type', description: 'Loại entity (nations, clubs, competitions, stadiums, cities, awards, people, stages)' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @ApiOkResponse({
    description: 'Dữ liệu bản ghi phẳng từ bảng CSDL',
    schema: {
      type: 'object',
      example: {
        id: '676',
        name_lg: 'Liverpool Football Club',
        name_sh: 'Liverpool',
        name_6l: "L'pool",
        name_3l: 'LIV',
        nation_id: '11',
        comp_id: '11',
        is_extinct: false,
      },
    },
  })
  @Get(':type/:id')
  getOne(
    @Param('type') type: RecordType,
    @Param('id') id: string,
  ) {
    return this.recordsService.getRecord(type, id);
  }

  @ApiOperation({ summary: 'Tạo mới 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity' })
  @ApiCreatedResponse({
    description: 'Bản ghi được tạo mới thành công',
    schema: {
      type: 'object',
      example: {
        id: '990001',
        name_lg: 'Hanoi Police FC',
        name_sh: 'CAHN',
        name_3l: 'CAH',
        nation_id: '560',
        comp_id: '1301389',
      },
    },
  })
  @Post(':type')
  create(
    @Param('type') type: RecordType,
    @Body() body: any,
  ) {
    return this.recordsService.createRecord(type, body);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @ApiOkResponse({
    description: 'Bản ghi sau khi cập nhật thành công',
    schema: {
      type: 'object',
      example: {
        id: '676',
        name_lg: 'Liverpool Football Club',
        name_sh: 'Liverpool',
        note: 'Updated via Swagger / LNC Manager',
      },
    },
  })
  @Put(':type/:id')
  update(
    @Param('type') type: RecordType,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.recordsService.updateRecord(type, id, body);
  }

  @ApiOperation({ summary: 'Xóa 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @ApiOkResponse({
    description: 'Kết quả xóa bản ghi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'club with ID 990001 deleted successfully' },
      },
      example: {
        success: true,
        message: 'club with ID 990001 deleted successfully',
      },
    },
  })
  @Delete(':type/:id')
  remove(
    @Param('type') type: RecordType,
    @Param('id') id: string,
  ) {
    return this.recordsService.deleteRecord(type, id);
  }
}

