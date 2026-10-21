import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 20;
    return this.searchService.search(q, l);
  }
}
