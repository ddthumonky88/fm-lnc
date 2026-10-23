import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';

@ApiTags('Hierarchy')
@Controller('api/hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @ApiOperation({ summary: 'Lấy danh sách Confederations (châu lục)' })
  @Get('continents')
  getContinents() {
    return this.hierarchyService.getContinents();
  }

  @ApiOperation({ summary: 'Lấy Nations theo Confederation ID' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @Get('continents/:id/nations')
  getNations(@Param('id') id: string) {
    return this.hierarchyService.getNationsByContinent(id);
  }

  @ApiOperation({ summary: 'Lấy International Competitions theo Confederation ID' })
  @ApiParam({ name: 'id', description: 'Confederation ID' })
  @Get('continents/:id/international-competitions')
  getIntCompetitions(@Param('id') id: string) {
    return this.hierarchyService.getIntCompetitionsByContinent(id);
  }

  @ApiOperation({ summary: 'Lấy hub đầy đủ của một Nation (clubs, competitions, cities...)' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @Get('nations/:id/hub')
  async getNationHub(@Param('id') id: string) {
    const hub = await this.hierarchyService.getNationHub(id);
    if (!hub) throw new NotFoundException(`Nation with ID ${id} not found`);
    return hub;
  }

  @ApiOperation({ summary: 'Lấy Domestic Competitions của một Nation' })
  @ApiParam({ name: 'id', description: 'Nation ID' })
  @Get('nations/:id/competitions')
  getDomesticCompetitions(@Param('id') id: string) {
    return this.hierarchyService.getDomesticCompetitions(id);
  }

  @Get('nations/:id/independent-clubs')
  getIndependentClubs(
    @Param('id') id: string,
    @Query('extinct') extinct?: string,
  ) {
    return this.hierarchyService.getIndependentClubs(id, extinct);
  }

  @Get('nations/:id/all-clubs')
  getAllClubs(@Param('id') id: string) {
    return this.hierarchyService.getAllClubsInNation(id);
  }

  @Get('nations/:id/stadiums')
  getStadiums(@Param('id') id: string) {
    return this.hierarchyService.getStadiums(id);
  }

  @Get('nations/:id/cities')
  getCities(@Param('id') id: string) {
    return this.hierarchyService.getCities(id);
  }

  @Get('nations/:id/awards')
  getAwards(@Param('id') id: string) {
    return this.hierarchyService.getAwardsByNation(id);
  }

  @Get('competitions/:id/clubs')
  getClubsInComp(@Param('id') id: string) {
    return this.hierarchyService.getClubsInCompetition(id);
  }

  @Get('competitions/:id/awards')
  getAwardsInComp(@Param('id') id: string) {
    return this.hierarchyService.getAwardsByCompetition(id);
  }

  @Get('competitions/:id/info')
  getCompetitionInfo(@Param('id') id: string) {
    return this.hierarchyService.getCompetitionInfo(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách Sub-competitions trực thuộc giải đấu cha' })
  @Get('competitions/:id/sub-competitions')
  getSubCompetitions(@Param('id') id: string) {
    return this.hierarchyService.getSubCompetitions(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách Players/Persons' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm kiếm theo tên' })
  @Get('players')
  getPlayers(@Query('q') q?: string) {
    return this.hierarchyService.getPlayers(q);
  }

  @ApiOperation({ summary: 'Lấy danh sách Stages' })
  @Get('stages')
  getStages(@Query('q') q?: string) {
    return this.hierarchyService.getStages(q);
  }

  @ApiOperation({ summary: 'Lấy tất cả Awards' })
  @Get('awards')
  getAllAwards() {
    return this.hierarchyService.getAllAwards();
  }

  @ApiOperation({ summary: 'Lấy tất cả Nations, có thể filter theo Confederation hoặc tìm kiếm' })
  @ApiQuery({ name: 'confedId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @Get('nations')
  getAllNations(
    @Query('confedId') confedId?: string,
    @Query('q') q?: string,
  ) {
    return this.hierarchyService.getAllNations(confedId, q);
  }

  @ApiOperation({ summary: 'Lấy tất cả Competitions, có thể filter nhiều chiều' })
  @ApiQuery({ name: 'confedId', required: false })
  @ApiQuery({ name: 'nationId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'isInternational', required: false, type: Boolean })
  @Get('competitions')
  getAllCompetitions(
    @Query('confedId') confedId?: string,
    @Query('nationId') nationId?: string,
    @Query('q') q?: string,
    @Query('isInternational') isInternational?: string,
  ) {
    const isInt = isInternational !== undefined ? isInternational === 'true' : undefined;
    return this.hierarchyService.getAllCompetitions(confedId, nationId, q, isInt);
  }
}
