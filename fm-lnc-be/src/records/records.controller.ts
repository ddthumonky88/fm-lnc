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
        id: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_6l: 'string',
        name_3l: 'string',
        nation_id: 'string',
        comp_id: 'string',
        is_extinct: true,
        competition_name: 'string',
        nation_name: 'string',
        nation_three_letter: 'string',
        nation: { id: 'string', name_lg: 'string', name_sh: 'string', name_3l: 'string' },
        competition: { id: 'string', name_lg: 'string', name_sh: 'string', name_3l: 'string' },
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
        id: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_6l: 'string',
        name_3l: 'string',
        nation_id: 'string',
        comp_id: 'string',
        is_extinct: true,
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
        id: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_3l: 'string',
        nation_id: 'string',
        comp_id: 'string',
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
        id: 'string',
        name_lg: 'string',
        name_sh: 'string',
        note: 'string',
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
        message: { type: 'string', example: 'string' },
      },
      example: {
        success: true,
        message: 'string',
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

