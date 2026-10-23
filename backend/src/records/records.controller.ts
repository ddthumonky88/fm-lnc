import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
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
  @Get(':type/:id/info')
  getInfo(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.hierarchyService.getEntityInfo(type, id);
  }

  @ApiOperation({ summary: 'Lấy chi tiết 1 bản ghi' })
  @ApiParam({ name: 'type', description: 'Loại entity (nations, clubs, competitions, stadiums, cities, awards, people, stages)' })
  @ApiParam({ name: 'id', description: 'ID của bản ghi' })
  @Get(':type/:id')
  getOne(
    @Param('type') type: RecordType,
    @Param('id') id: string,
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
    @Param('id') id: string,
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
    @Param('id') id: string,
  ) {
    return this.recordsService.deleteRecord(type, id);
  }
}
