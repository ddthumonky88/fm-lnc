import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';

@Controller('api/hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get('continents')
  getContinents() {
    return this.hierarchyService.getContinents();
  }

  @Get('continents/:id/nations')
  getNations(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getNationsByContinent(id);
  }

  @Get('continents/:id/international-competitions')
  getIntCompetitions(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getIntCompetitionsByContinent(id);
  }

  @Get('nations/:id/hub')
  async getNationHub(@Param('id', ParseIntPipe) id: number) {
    const hub = await this.hierarchyService.getNationHub(id);
    if (!hub) throw new NotFoundException(`Nation with ID ${id} not found`);
    return hub;
  }

  @Get('nations/:id/competitions')
  getDomesticCompetitions(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getDomesticCompetitions(id);
  }

  @Get('nations/:id/independent-clubs')
  getIndependentClubs(
    @Param('id', ParseIntPipe) id: number,
    @Query('extinct') extinct?: string,
  ) {
    return this.hierarchyService.getIndependentClubs(id, extinct);
  }

  @Get('nations/:id/all-clubs')
  getAllClubs(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getAllClubsInNation(id);
  }

  @Get('nations/:id/stadiums')
  getStadiums(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getStadiums(id);
  }

  @Get('nations/:id/cities')
  getCities(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getCities(id);
  }

  @Get('nations/:id/awards')
  getAwards(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getAwardsByNation(id);
  }

  @Get('competitions/:id/clubs')
  getClubsInComp(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getClubsInCompetition(id);
  }

  @Get('competitions/:id/awards')
  getAwardsInComp(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getAwardsByCompetition(id);
  }

  @Get('competitions/:id/info')
  getCompetitionInfo(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getCompetitionInfo(id);
  }

  @Get('players')
  getPlayers(@Query('q') q?: string) {
    return this.hierarchyService.getPlayers(q);
  }

  @Get('stages')
  getStages(@Query('q') q?: string) {
    return this.hierarchyService.getStages(q);
  }

  @Get('awards')
  getAllAwards() {
    return this.hierarchyService.getAllAwards();
  }

  @Get('nations')
  getAllNations(
    @Query('confedId') confedId?: string,
    @Query('q') q?: string,
  ) {
    const cId = confedId ? parseInt(confedId, 10) : undefined;
    return this.hierarchyService.getAllNations(cId, q);
  }

  @Get('competitions')
  getAllCompetitions(
    @Query('confedId') confedId?: string,
    @Query('nationId') nationId?: string,
    @Query('q') q?: string,
    @Query('isInternational') isInternational?: string,
  ) {
    const cId = confedId ? parseInt(confedId, 10) : undefined;
    const nId = nationId ? parseInt(nationId, 10) : undefined;
    const isInt = isInternational !== undefined ? isInternational === 'true' : undefined;
    return this.hierarchyService.getAllCompetitions(cId, nId, q, isInt);
  }
}
