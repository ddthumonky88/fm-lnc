import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { RecordsService, RecordType } from './records.service';

@Controller('api/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get(':type/:id')
  getOne(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordsService.getRecord(type, id);
  }

  @Post(':type')
  create(
    @Param('type') type: RecordType,
    @Body() body: any,
  ) {
    return this.recordsService.createRecord(type, body);
  }

  @Put(':type/:id')
  update(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.recordsService.updateRecord(type, id, body);
  }

  @Delete(':type/:id')
  remove(
    @Param('type') type: RecordType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordsService.deleteRecord(type, id);
  }
}
