import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Tìm kiếm toàn văn theo từ khóa' })
  @ApiQuery({ name: 'q', description: 'Từ khóa tìm kiếm (tên câu lạc bộ, giải đấu, quốc gia...)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số lượng kết quả (mặc định 20)' })
  @Get()
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 20;
    return this.searchService.search(q, l);
  }
}
