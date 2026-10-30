import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiOkResponse, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import {
  PageableQueryDto,
  SearchFilterDto,
  NationSearchQueryDto,
  IntCompetitionSearchQueryDto,
  DomesticCompetitionSearchQueryDto,
  CitySearchQueryDto,
  NationScopedSearchQueryDto,
  ClubSearchQueryDto,
  AwardSearchQueryDto,
} from './dto/pagination.dto';

@ApiTags('Hierarchy')
@Controller('api/hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @ApiOperation({ summary: 'Lấy danh sách Confederations (châu lục)' })
  @ApiOkResponse({
    description: 'Danh sách các liên đoàn kèm số lượng quốc gia và giải đấu quốc tế',
    schema: {
      type: 'array',
      example: [
        {
          id: 'string',
          name: 'string',
          stats: {
            nations: 0,
            intComps: 0,
          },
        },
      ],
    },
  })
  @Get('list-confederations')
  getListConfederations() {
    return this.hierarchyService.getListConfederations();
  }

  @ApiOperation({ summary: 'Tìm kiếm quốc gia có phân trang và lọc theo liên đoàn' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách quốc gia có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            confed: {
              id: 'string',
              name: 'string',
            },
            inactive_fields: 'string',
            note: 'string',
            stats: {
              comps: 0,
              clubs: 0,
              stadiums: 0,
              cities: 0,
              awards: 0,
              children: 0,
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('nations/search')
  searchNations(
    @Query() query?: NationSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getAllNations(filter);
  }

  @ApiOperation({ summary: 'Tìm kiếm giải đấu quốc tế có phân trang và lọc theo liên đoàn' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải đấu quốc tế có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            fg_color: 'string',
            bg_color: 'string',
            type: 'string',
            note: 'string',
            inactive_fields: 'string',
            confed: {
              id: 'string',
              name: 'string',
            },
            parent_comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            stats: {
              club: 0,
              award: 0,
              children: 0,
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('int-competitions/search')
  searchIntCompetitions(
    @Query() query?: IntCompetitionSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getIntCompetitions(filter);
  }

  @ApiExcludeEndpoint()
  @Get('nations/:id/hub')
  async getNationHub(@Param('id') id: string) {
    const hub = await this.hierarchyService.getNationInfo(id);
    if (!hub) throw new NotFoundException(`Nation with ID ${id} not found`);
    return hub;
  }

  @ApiOperation({ summary: 'Tìm kiếm giải đấu quốc nội có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải đấu quốc nội có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            fg_color: 'string',
            bg_color: 'string',
            type: 'string',
            note: 'string',
            inactive_fields: 'string',
            confed: {
              id: 'string',
              name: 'string',
            },
            parent_comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            stats: {
              club: 0,
              award: 0,
              children: 0,
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('domestic-competitions/search')
  searchDomesticCompetitions(
    @Query() query?: DomesticCompetitionSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getDomesticCompetitions(filter);
  }

  @ApiOperation({
    summary:
      'Tìm kiếm CLB có phân trang theo quốc gia hoặc giải đấu (với Other Clubs: compId = oth-{nationId}, Extinct Clubs: compId = ext-{nationId})',
  })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách CLB có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_6l: 'string',
            name_3l: 'string',
            note: 'string',
            inactive_fields: 'string',
            is_extinct: true,
            affiliate_club: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_6l: 'string',
              name_3l: 'string',
              type: 'string',
            },
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            affiliatesCount: 0,
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('club/search')
  searchClub(
    @Query() query?: ClubSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.searchClubs(filter);
  }

  @ApiOperation({ summary: 'Tìm kiếm sân vận động có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách sân vận động có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            type: 'string',
            is_disabled: true,
            inactive_fields: 'string',
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('stadiums/search')
  searchStadiums(
    @Query() query?: NationScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getStadiums(filter);
  }

  @ApiOperation({ summary: 'Tìm kiếm thành phố có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách thành phố có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            region: 'string',
            is_disabled: true,
            inactive_fields: 'string',
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('cities/search')
  searchCities(
    @Query() query?: CitySearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getCities(filter);
  }

  @ApiOperation({ summary: 'Lấy tất cả khu vực (regions) (hỗ trợ lọc nationId / keyword)' })
  @ApiQuery({ name: 'nationId', required: false, description: 'ID quốc gia (hoặc "all" để lấy tất cả)' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Từ khóa tìm kiếm (tên hoặc mã code)' })
  @ApiOkResponse({
    description: 'Danh sách các khu vực (regions) kèm id, name, code, nation_id, citiesCount',
    schema: {
      type: 'array',
      example: [
        {
          id: 0,
          name: 'string',
          code: 'string',
          nation_id: 'string',
          citiesCount: 0,
        },
      ],
    },
  })
  @Get('regions')
  getRegions(
    @Query('nationId') nationId?: string,
    @Query('nation_id') nationIdSnake?: string,
    @Query('keyword') keyword?: string,
    @Query() query?: any,
  ) {
    const targetNationId = nationId || nationIdSnake || query?.nationId || query?.nation_id;
    const searchKey = keyword || query?.keyword;
    return this.hierarchyService.getRegionsByNation({ ...query, nationId: targetNationId, keyword: searchKey });
  }

  @ApiExcludeEndpoint()
  @Get('nations/:nationId/regions')
  getRegionsByNationParam(
    @Param('nationId') nationId: string,
    @Query() query?: any,
  ) {
    return this.getRegions(nationId, undefined, undefined, query);
  }

  @ApiExcludeEndpoint()
  @Post('regions/search')
  searchRegions(
    @Query() query?: NationScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    const targetNatId = filter.nationId || (filter as any).nation_id;
    return this.getRegions(targetNatId, undefined, filter.keyword, filter);
  }

  @ApiOperation({ summary: 'Tìm kiếm giải thưởng theo quốc gia hoặc giải đấu' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải thưởng có phân trang',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            inactive_fields: 'string',
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('awards/search')
  searchAwards(
    @Query() query?: AwardSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    if (filter.compId) {
      return this.hierarchyService.getAwardsByCompetition(filter);
    }
    return this.hierarchyService.getAwardsByNation(filter);
  }

  @ApiExcludeEndpoint()
  @Get('competitions/:compId/awards')
  getAwardsByComp(
    @Param('compId') compId: string,
    @Query() query?: any,
  ) {
    return this.hierarchyService.getAwardsByCompetition({ ...query, compId });
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Confederation (Châu lục)' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết liên đoàn kèm thống kê',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        totalNations: 0,
        totalIntComps: 0,
        totalComps: 0,
        totalClubs: 0,
        totalStadiums: 0,
        totalCities: 0,
        totalAwards: 0,
      },
    },
  })
  @Get('continents/:id/info')
  getContinentInfo(@Param('id') id: string) {
    return this.hierarchyService.getContinentInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết và hub của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết quốc gia kèm các bộ đếm',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_3l: 'string',
        confed: {
          id: 'string',
          name: 'string',
        },
        counts: {
          domesticComps: 0,
          parentComps: 0,
          totalComps: 0,
          independentClubs: 0,
          extinctClubs: 0,
          allClubs: 0,
          stadiums: 0,
          cities: 0,
          awards: 0,
          totalAwards: 0,
        },
      },
    },
  })
  @Get('nations/:id/info')
  getNationInfo(@Param('id') id: string) {
    return this.hierarchyService.getNationInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Club' })
  @ApiParam({ name: 'id', description: 'Club ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết câu lạc bộ',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_6l: 'string',
        name_3l: 'string',
        note: 'string',
        inactive_fields: 'string',
        is_extinct: true,
        affiliate_club: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_6l: 'string',
          name_3l: 'string',
          type: 'string',
        },
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
        comp: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
        affiliatesCount: 0,
      },
    },
  })
  @Get('clubs/:id/info')
  getClubInfo(@Param('id') id: string) {
    return this.hierarchyService.getClubInfo(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách các câu lạc bộ con (affiliate clubs) của một đội 1' })
  @ApiParam({ name: 'id', description: 'ID của câu lạc bộ đội 1' })
  @ApiOkResponse({
    description: 'Danh sách các đội con / đội trẻ / đội dự bị liên kết kèm loại đội con',
    schema: {
      type: 'array',
      example: [
        {
          id: 'string',
          name: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_6l: 'string',
          name_3l: 'string',
          note: 'string',
          inactive_fields: 'string',
          is_extinct: true,
          affiliate_club: {
            id: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_6l: 'string',
            name_3l: 'string',
            type: 'string',
          },
          nation: {
            id: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
          },
          comp: {
            id: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
          },
          affiliatesCount: 0,
        },
      ],
    },
  })
  @Get('clubs/:id/affiliates')
  getClubAffiliates(@Param('id') id: string) {
    return this.hierarchyService.getClubAffiliates(id);
  }


  @ApiOperation({ summary: 'Lấy thông tin chi tiết một City' })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết thành phố',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        region: 'string',
        is_disabled: true,
        inactive_fields: 'string',
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
      },
    },
  })
  @Get('cities/:id/info')
  getCityInfo(@Param('id') id: string) {
    return this.hierarchyService.getCityInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Award' })
  @ApiParam({ name: 'id', description: 'Award ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết giải thưởng',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_3l: 'string',
        inactive_fields: 'string',
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
        comp: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
      },
    },
  })
  @Get('awards/:id/info')
  getAwardInfo(@Param('id') id: string) {
    return this.hierarchyService.getAwardInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Stadium' })
  @ApiParam({ name: 'id', description: 'Stadium ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết sân vận động',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        type: 'string',
        is_disabled: true,
        inactive_fields: 'string',
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
      },
    },
  })
  @Get('stadiums/:id/info')
  getStadiumInfo(@Param('id') id: string) {
    return this.hierarchyService.getStadiumInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Region' })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết khu vực kèm mã và số lượng thành phố',
    schema: {
      type: 'object',
      example: {
        id: 0,
        name: 'string',
        code: 'string',
        nation_id: 'string',
        citiesCount: 0,
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
      },
    },
  })
  @Get('regions/:id/info')
  getRegionInfo(@Param('id') id: string) {
    return this.hierarchyService.getRegionInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Competition' })
  @ApiParam({ name: 'id', description: 'Competition ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết giải đấu',
    schema: {
      type: 'object',
      example: {
        id: 'string',
        name: 'string',
        name_lg: 'string',
        name_sh: 'string',
        name_3l: 'string',
        fg_color: 'string',
        bg_color: 'string',
        type: 'string',
        note: 'string',
        inactive_fields: 'string',
        confed: {
          id: 'string',
          name: 'string',
        },
        parent_comp: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
        nation: {
          id: 'string',
          name_lg: 'string',
          name_sh: 'string',
          name_3l: 'string',
        },
        stats: {
          club: 0,
          award: 0,
          children: 0,
        },
      },
    },
  })
  @Get('competitions/:id/info')
  getCompetitionInfo(@Param('id') id: string) {
    return this.hierarchyService.getCompetitionInfo(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách Sub-competitions trực thuộc giải đấu cha' })
  @ApiParam({ name: 'id', description: 'Competition ID cha' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách các giải đấu con / phân hạng (parent_id = :id)',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            fg_color: 'string',
            bg_color: 'string',
            type: 'string',
            note: 'string',
            inactive_fields: 'string',
            confed: {
              id: 'string',
              name: 'string',
            },
            parent_comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            stats: {
              club: 0,
              award: 0,
              children: 0,
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('competitions/:id/sub-competitions')
  getSubCompetitions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getSubCompetitions(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách Players/Persons' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách cầu thủ/nhân sự',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            first_name: 'string',
            common_name: 'string',
            second_name: 'string',
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('players')
  getPlayers(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getPlayers({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách Stages' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giai đoạn/vòng đấu',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('stages')
  getStages(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getStages({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy tất cả Awards' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách toàn bộ giải thưởng',
    schema: {
      type: 'object',
      example: {
        content: [
          {
            id: 'string',
            name: 'string',
            name_lg: 'string',
            name_sh: 'string',
            name_3l: 'string',
            inactive_fields: 'string',
            nation: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
            comp: {
              id: 'string',
              name_lg: 'string',
              name_sh: 'string',
              name_3l: 'string',
            },
          },
        ],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
        hasPrevious: true,
        hasNext: true,
        first: true,
        last: true,
      },
    },
  })
  @Post('awards')
  getAllAwards(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getAllAwards({ ...query, ...body });
  }
}
