import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RecordsService, RecordType } from './records.service';

@ApiTags('Records')
@Controller('api/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @ApiOperation({ summary: 'Lấy chi tiết 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity (nations, clubs, competitions, stadiums, cities, awards, people, stages)' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @Get(':type/:id')
  getOne(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordsService.getRecord(type, id);
  }

  @ApiOperation({ summary: 'Tạo mới 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity' })
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
  @Put(':type/:id')
  update(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.recordsService.updateRecord(type, id, body);
  }

  @ApiOperation({ summary: 'Xóa 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @Delete(':type/:id')
  remove(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordsService.deleteRecord(type, id);
  }
}
