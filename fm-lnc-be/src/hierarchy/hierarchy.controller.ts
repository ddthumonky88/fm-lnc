import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiOkResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import {
  PageableQueryDto,
  SearchFilterDto,
  NationSearchQueryDto,
  IntCompetitionSearchQueryDto,
  DomesticCompetitionSearchQueryDto,
  IndependentClubSearchQueryDto,
  CitySearchQueryDto,
  NationScopedSearchQueryDto,
  CompScopedSearchQueryDto,
  ClubSearchQueryDto,
  AwardSearchQueryDto,
  CompetitionListFilterDto,
} from './dto/pagination.dto';

@ApiTags('Hierarchy')
@Controller('api/hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @ApiOperation({ summary: 'Lấy danh sách Confederations (châu lục)' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách các liên đoàn kèm số lượng quốc gia và giải đấu quốc tế',
    schema: {
      type: 'array',
      example: [
        { id: '1', name: 'Africa', stats: { nations: 57, intComps: 23 } },
        { id: '2', name: 'Asia', stats: { nations: 47, intComps: 38 } },
        { id: '3', name: 'Europe', stats: { nations: 56, intComps: 31 } },
        { id: '4', name: 'North America', stats: { nations: 43, intComps: 20 } },
        { id: '5', name: 'Oceania', stats: { nations: 15, intComps: 9 } },
        { id: '6', name: 'South America', stats: { nations: 10, intComps: 12 } },
        { id: '7', name: 'World', stats: { nations: 22, intComps: 31 } },
      ],
    },
  })
  @Get('list-confederations')
  getListConfederations(@Query() query?: SearchFilterDto) {
    return this.hierarchyService.getListConfederations(query);
  }

  @ApiExcludeEndpoint()
  @Post('continents')
  getContinents(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getContinents({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm quốc gia có phân trang và lọc theo liên đoàn' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('nations/search')
  searchNations(
    @Query() query?: NationSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getAllNations(filter);
  }

  @ApiExcludeEndpoint()
  @Post('continents/:id/nations')
  getNations(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAllNations({ confedId: id, ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm giải đấu quốc tế có phân trang và lọc theo liên đoàn' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('int-competitions/search')
  searchIntCompetitions(
    @Query() query?: IntCompetitionSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getIntCompetitions(filter);
  }

  @ApiExcludeEndpoint()
  @Post('continents/:id/international-competitions')
  getIntCompetitions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getIntCompetitions({ confedId: id, ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy hub đầy đủ của một Nation (clubs, competitions, cities...)' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiOkResponse({
    description: 'Thông tin Nation Hub kèm số lượng tổng hợp',
    schema: {
      type: 'object',
      example: {
        nation: {
          id: '11',
          long_name: 'England',
          short_name: 'England',
          three_letter_name: 'ENG',
          confederation_id: '1',
          confederation: { id: '1', name: 'Europe (UEFA)' },
        },
        counts: {
          domesticComps: 16,
          independentClubs: 120,
          allClubs: 450,
          stadiums: 65,
          cities: 110,
          awards: 25,
        },
      },
    },
  })
  @Get('nations/:id/hub')
  async getNationHub(@Param('id') id: string) {
    const hub = await this.hierarchyService.getNationHub(id);
    if (!hub) throw new NotFoundException(`Nation with ID ${id} not found`);
    return hub;
  }

  @ApiOperation({ summary: 'Tìm kiếm giải đấu quốc nội có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('domestic-competitions/search')
  searchDomesticCompetitions(
    @Query() query?: DomesticCompetitionSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getDomesticCompetitions(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/competitions')
  getDomesticCompetitions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getDomesticCompetitions(id, { ...query, ...body });
  }

  @ApiOperation({
    summary:
      'Tìm kiếm CLB có phân trang theo quốc gia hoặc giải đấu (với Other Clubs: compId = oth-{nationId}, Extinct Clubs: compId = ext-{nationId})',
  })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('club/search')
  searchClub(
    @Query() query?: ClubSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.searchClubs(filter);
  }

  @ApiExcludeEndpoint()
  @Post('clubs/search')
  searchClubs(
    @Query() query?: ClubSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.searchClubs(filter);
  }

  @ApiExcludeEndpoint()
  @Post('independent-clubs/search')
  searchIndependentClubs(
    @Query() query?: IndependentClubSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getIndependentClubs(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/independent-clubs')
  getIndependentClubs(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: IndependentClubSearchQueryDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getIndependentClubs(id, filter);
  }

  @ApiExcludeEndpoint()
  @Post('all-clubs/search')
  searchAllClubs(
    @Query() query?: NationScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getAllClubsInNation(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/all-clubs')
  getAllClubs(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAllClubsInNation(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm sân vận động có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('stadiums/search')
  searchStadiums(
    @Query() query?: NationScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getStadiums(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/stadiums')
  getStadiums(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getStadiums(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm thành phố có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('cities/search')
  searchCities(
    @Query() query?: CitySearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getCities(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/cities')
  getCities(
    @Param('id') id: string,
    @Query() query?: CitySearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getCities(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm khu vực (regions) có phân trang và lọc theo quốc gia' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('regions/search')
  searchRegions(
    @Query() query?: NationScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getRegionsByNation(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/regions')
  getRegions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getRegionsByNation(id, { ...query, ...body });
  }

  @ApiExcludeEndpoint()
  @Post('competition-clubs/search')
  searchCompetitionClubs(
    @Query() query?: CompScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getClubsInCompetition(filter);
  }

  @ApiExcludeEndpoint()
  @Post('competitions/:id/clubs')
  getClubsInComp(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getClubsInCompetition(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Tìm kiếm giải thưởng theo quốc gia hoặc giải đấu' })
  @ApiBody({ type: SearchFilterDto, required: false })
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
  @ApiOperation({ summary: 'Tìm kiếm giải thưởng thuộc một giải đấu' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @Post('competition-awards/search')
  searchCompetitionAwards(
    @Query() query?: CompScopedSearchQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getAwardsByCompetition(filter);
  }

  @ApiExcludeEndpoint()
  @Post('nations/:id/awards')
  getAwards(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAwardsByNation(id, { ...query, ...body });
  }

  @ApiExcludeEndpoint()
  @Post('competitions/:id/awards')
  getAwardsInComp(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAwardsByCompetition(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Confederation (Châu lục)' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết liên đoàn kèm thống kê',
    schema: {
      type: 'object',
      example: {
        id: '1',
        name: 'Europe (UEFA)',
        totalNations: 55,
        totalIntComps: 12,
        totalComps: 420,
        totalClubs: 6500,
        totalStadiums: 980,
        totalCities: 620,
        totalAwards: 180,
      },
    },
  })
  @Get('continents/:id/info')
  getContinentInfo(@Param('id') id: string) {
    return this.hierarchyService.getContinentInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Confederation (Châu lục) - alias' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết liên đoàn kèm thống kê (alias)',
    schema: {
      type: 'object',
      example: {
        id: '1',
        name: 'Europe (UEFA)',
        stats: {
          nations: 55,
          intComps: 12,
          comps: 420,
          clubs: 6500,
          stadiums: 980,
          cities: 620,
          awards: 180,
        },
      },
    },
  })
  @Get('confederations/:id/info')
  getConfederationInfo(@Param('id') id: string) {
    return this.hierarchyService.getContinentInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết quốc gia kèm các bộ đếm',
    schema: {
      type: 'object',
      example: {
        id: '11',
        long_name: 'England',
        short_name: 'England',
        three_letter_name: 'ENG',
        confederation_id: '1',
        confederation_name: 'Europe (UEFA)',
        confederation: { id: '1', name: 'Europe (UEFA)' },
        counts: {
          domesticComps: 16,
          parentComps: 14,
          totalComps: 22,
          independentClubs: 120,
          extinctClubs: 15,
          allClubs: 450,
          stadiums: 65,
          cities: 110,
          awards: 25,
          totalAwards: 40,
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
        id: '676',
        long_name: 'Liverpool Football Club',
        short_name: 'Liverpool',
        six_letter_name: "L'pool",
        three_letter_name: 'LIV',
        nation_id: '11',
        comp_id: '11',
        is_extinct: false,
        competition_name: 'Premier League',
        nation_name: 'England',
        nation_three_letter: 'ENG',
      },
    },
  })
  @Get('clubs/:id/info')
  getClubInfo(@Param('id') id: string) {
    return this.hierarchyService.getClubInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một City' })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết thành phố',
    schema: {
      type: 'object',
      example: {
        id: '123',
        name: 'London',
        country_id: '11',
        categories: 'Capital',
        nation_name: 'England',
        nation_three_letter: 'ENG',
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
        id: '456',
        long_name: "PFA Players' Player of the Year",
        short_name: 'PFA Player of the Year',
        nation_id: '11',
        comp_id: '11',
        nation_name: 'England',
        competition_name: 'Premier League',
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
        id: '789',
        name: 'Anfield',
        nation_id: '11',
        nation_name: 'England',
        nation_three_letter: 'ENG',
      },
    },
  })
  @Get('stadiums/:id/info')
  getStadiumInfo(@Param('id') id: string) {
    return this.hierarchyService.getStadiumInfo(id);
  }

  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Competition' })
  @ApiParam({ name: 'id', description: 'Competition ID' })
  @ApiOkResponse({
    description: 'Thông tin chi tiết giải đấu',
    schema: {
      type: 'object',
      example: {
        id: '11',
        long_name: 'English Premier Division',
        short_name: 'Premier League',
        three_letter_name: 'PL',
        fg_color: '255 255 255',
        bg_color: '56 0 60',
        clubsCount: 20,
        awardsCount: 12,
        childrenCount: 0,
        nation: { id: '11', long_name: 'England', short_name: 'England' },
        confederation: { id: '1', name: 'Europe (UEFA)' },
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
      type: 'array',
      example: [
        {
          id: '1301394',
          long_name: 'UEFA Champions League Qualifying Phase',
          short_name: 'Champions League Qualifying',
          three_letter_name: 'UCLQ',
          parent_id: '1301393',
          parent_name: 'Champions League',
          clubsCount: 32,
          awardsCount: 0,
          childrenCount: 0,
        },
      ],
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
      type: 'array',
      example: [
        { id: '12345', first_name: 'Lionel', common_name: 'Messi', second_name: 'Messi' },
      ],
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
      type: 'array',
      example: [{ id: '1', name: 'Vòng bảng' }],
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
      type: 'array',
      example: [{ id: '456', long_name: "Ballon d'Or", short_name: "Ballon d'Or" }],
    },
  })
  @Post('awards')
  getAllAwards(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getAllAwards({ ...query, ...body });
  }

  @ApiExcludeEndpoint()
  @Post('nations')
  getAllNations(@Query() query?: PageableQueryDto, @Body() body?: NationSearchQueryDto) {
    return this.hierarchyService.getAllNations({ ...query, ...body });
  }

  @ApiExcludeEndpoint()
  @Post('competitions')
  getAllCompetitions(
    @Query() query?: PageableQueryDto,
    @Body() body?: CompetitionListFilterDto,
  ) {
    const filter = { ...query, ...body };
    const isInt =
      filter.isInternational !== undefined
        ? String(filter.isInternational) === 'true'
        : undefined;
    return this.hierarchyService.getAllCompetitions({
      ...filter,
      isInternational: isInt,
    });
  }
}
