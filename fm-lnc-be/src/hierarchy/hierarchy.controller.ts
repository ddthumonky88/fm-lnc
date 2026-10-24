import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import {
  PageableQueryDto,
  SearchFilterDto,
  NationListFilterDto,
  CompetitionListFilterDto,
  IndependentClubFilterDto,
  CityFilterDto,
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
  @Post('continents')
  @Get('continents')
  getContinents(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getContinents({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy Nations theo Confederation ID' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách các quốc gia thuộc liên đoàn kèm thống kê các thực thể con',
    schema: {
      type: 'array',
      example: [
        {
          id: '11',
          long_name: 'England',
          short_name: 'England',
          three_letter_name: 'ENG',
          confederation_id: '1',
          stats: {
            comps: 14,
            clubs: 450,
            stadiums: 65,
            cities: 110,
            awards: 25,
            children: 664,
          },
        },
      ],
    },
  })
  @Post('continents/:id/nations')
  @Get('continents/:id/nations')
  getNations(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getNationsByContinent(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy International Competitions theo Confederation ID' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải đấu quốc tế cấp cha (parent_id IS NULL)',
    schema: {
      type: 'array',
      example: [
        {
          id: '1301380',
          long_name: 'UEFA Champions League',
          short_name: 'Champions League',
          three_letter_name: 'UCL',
          confed_id: '3',
          is_international: true,
        },
      ],
    },
  })
  @Post('continents/:id/international-competitions')
  @Get('continents/:id/international-competitions')
  getIntCompetitions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getIntCompetitionsByContinent(id, { ...query, ...body });
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

  @ApiOperation({ summary: 'Lấy Domestic Competitions của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải đấu quốc nội cấp cha (parent_id IS NULL) và 2 node [OTHER], [EXTINCT]',
    schema: {
      type: 'array',
      example: [
        {
          id: '11',
          long_name: 'English Premier Division',
          short_name: 'Premier League',
          three_letter_name: 'PL',
          fg_color: '255 255 255',
          bg_color: '56 0 60',
          parent_id: null,
          clubsCount: 20,
          awardsCount: 12,
          childrenCount: 0,
        },
      ],
    },
  })
  @Post('nations/:id/competitions')
  @Get('nations/:id/competitions')
  getDomesticCompetitions(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getDomesticCompetitions(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách CLB độc lập của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: IndependentClubFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách câu lạc bộ độc lập',
    schema: {
      type: 'array',
      example: [
        {
          id: '9901',
          long_name: 'London Amateur FC',
          short_name: 'London Amateur',
          nation_id: '11',
          comp_id: null,
          is_extinct: false,
        },
      ],
    },
  })
  @Post('nations/:id/independent-clubs')
  @Get('nations/:id/independent-clubs')
  getIndependentClubs(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: IndependentClubFilterDto,
  ) {
    const filter = { ...query, ...body };
    return this.hierarchyService.getIndependentClubs(id, filter);
  }

  @ApiOperation({ summary: 'Lấy tất cả CLB trong một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách toàn bộ câu lạc bộ của quốc gia',
    schema: {
      type: 'array',
      example: [
        {
          id: '676',
          long_name: 'Liverpool Football Club',
          short_name: 'Liverpool',
          comp_id: '11',
          competition: { id: '11', short_name: 'Premier League' },
        },
      ],
    },
  })
  @Post('nations/:id/all-clubs')
  @Get('nations/:id/all-clubs')
  getAllClubs(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAllClubsInNation(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách sân vận động của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách sân vận động',
    schema: {
      type: 'array',
      example: [{ id: '789', name: 'Anfield', nation_id: '11' }],
    },
  })
  @Post('nations/:id/stadiums')
  @Get('nations/:id/stadiums')
  getStadiums(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getStadiums(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách thành phố của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: CityFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách thành phố',
    schema: {
      type: 'array',
      example: [{ id: '123', name: 'London', country_id: '11', categories: 'Capital' }],
    },
  })
  @Post('nations/:id/cities')
  @Get('nations/:id/cities')
  getCities(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: CityFilterDto,
  ) {
    return this.hierarchyService.getCities(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách giải thưởng độc lập cấp Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải thưởng cấp quốc gia',
    schema: {
      type: 'array',
      example: [{ id: '456', long_name: 'National Player of the Year', short_name: 'Player of Year', nation_id: '11' }],
    },
  })
  @Post('nations/:id/awards')
  @Get('nations/:id/awards')
  getAwards(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getAwardsByNation(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách CLB trong một giải đấu' })
  @ApiParam({ name: 'id', description: 'Competition ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách câu lạc bộ thi đấu tại giải',
    schema: {
      type: 'array',
      example: [{ id: '676', long_name: 'Liverpool Football Club', short_name: 'Liverpool', comp_id: '11' }],
    },
  })
  @Post('competitions/:id/clubs')
  @Get('competitions/:id/clubs')
  getClubsInComp(
    @Param('id') id: string,
    @Query() query?: PageableQueryDto,
    @Body() body?: SearchFilterDto,
  ) {
    return this.hierarchyService.getClubsInCompetition(id, { ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy danh sách giải thưởng trong một giải đấu' })
  @ApiParam({ name: 'id', description: 'Competition ID' })
  @ApiBody({ type: SearchFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải thưởng thuộc giải đấu',
    schema: {
      type: 'array',
      example: [{ id: '456', long_name: 'Premier League Golden Boot', short_name: 'Golden Boot', comp_id: '11' }],
    },
  })
  @Post('competitions/:id/awards')
  @Get('competitions/:id/awards')
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
  @Get('competitions/:id/sub-competitions')
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
  @Get('players')
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
  @Get('stages')
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
  @Get('awards')
  getAllAwards(@Query() query?: PageableQueryDto, @Body() body?: SearchFilterDto) {
    return this.hierarchyService.getAllAwards({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy tất cả Nations, có thể filter theo Confederation hoặc tìm kiếm' })
  @ApiBody({ type: NationListFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách quốc gia thỏa điều kiện lọc',
    schema: {
      type: 'array',
      example: [
        {
          id: '11',
          long_name: 'England',
          short_name: 'England',
          three_letter_name: 'ENG',
          confederation_id: '1',
          confederation_name: 'Europe (UEFA)',
        },
      ],
    },
  })
  @Post('nations')
  @Get('nations')
  getAllNations(@Query() query?: PageableQueryDto, @Body() body?: NationListFilterDto) {
    return this.hierarchyService.getAllNations({ ...query, ...body });
  }

  @ApiOperation({ summary: 'Lấy tất cả Competitions, có thể filter nhiều chiều' })
  @ApiBody({ type: CompetitionListFilterDto, required: false })
  @ApiOkResponse({
    description: 'Danh sách giải đấu thỏa điều kiện lọc',
    schema: {
      type: 'array',
      example: [
        {
          id: '11',
          long_name: 'English Premier Division',
          short_name: 'Premier League',
          three_letter_name: 'PL',
          is_international: false,
        },
      ],
    },
  })
  @Post('competitions')
  @Get('competitions')
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
