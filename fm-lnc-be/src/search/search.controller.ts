import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Tìm kiếm toàn văn theo từ khóa' })
  @ApiQuery({ name: 'q', description: 'Từ khóa tìm kiếm (tên câu lạc bộ, giải đấu, quốc gia...)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Giới hạn số lượng kết quả (mặc định 20)' })
  @ApiOkResponse({
    description: 'Kết quả tìm kiếm toàn văn đồng thời trên 8 bảng thực thể',
    schema: {
      type: 'object',
      properties: {
        clubs: { type: 'array', items: { type: 'object' } },
        competitions: { type: 'array', items: { type: 'object' } },
        nations: { type: 'array', items: { type: 'object' } },
        stadiums: { type: 'array', items: { type: 'object' } },
        cities: { type: 'array', items: { type: 'object' } },
        awards: { type: 'array', items: { type: 'object' } },
        players: { type: 'array', items: { type: 'object' } },
        stages: { type: 'array', items: { type: 'object' } },
      },
      example: {
        clubs: [
          {
            id: '676',
            long_name: 'Liverpool Football Club',
            short_name: 'Liverpool',
            nation: { id: '11', long_name: 'England' },
          },
        ],
        competitions: [
          {
            id: '11',
            long_name: 'English Premier Division',
            short_name: 'Premier League',
          },
        ],
        nations: [],
        stadiums: [],
        cities: [],
        awards: [],
        players: [],
        stages: [],
      },
    },
  })
  @Get()
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 20;
    return this.searchService.search(q, l);
  }
}

