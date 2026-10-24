import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Nation,
  Competition,
  Club,
  Stadium,
  City,
  Award,
  Person,
  Stage,
} from '../entities';
import {
  mapClub,
  mapCompetition,
  mapNation,
  mapStadium,
  mapCity,
  mapAward,
} from '../common/entity-mapper';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
  ) {}

  async search(query: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return {
        clubs: [],
        competitions: [],
        nations: [],
        stadiums: [],
        cities: [],
        awards: [],
        players: [],
        stages: [],
      };
    }

    const term = query.trim();
    const isId = /^\d+$/.test(term);
    const idVal = isId ? parseInt(term, 10) : -1;

    const [clubs, competitions, nations, stadiums, cities, awards, players, stages] = await Promise.all([
      this.clubRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.nation', 'nation')
        .leftJoinAndSelect('c.competition', 'comp')
        .where('c.name_lg ILIKE :q', { q: `%${term}%` })
        .orWhere('c.name_sh ILIKE :q', { q: `%${term}%` })
        .orWhere('c.name_3l ILIKE :q', { q: `%${term}%` })
        .orWhere('c.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.compRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.nation', 'nation')
        .leftJoinAndSelect('c.confederation', 'confed')
        .where('c.name_lg ILIKE :q', { q: `%${term}%` })
        .orWhere('c.name_sh ILIKE :q', { q: `%${term}%` })
        .orWhere('c.name_3l ILIKE :q', { q: `%${term}%` })
        .orWhere('c.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.nationRepo
        .createQueryBuilder('n')
        .leftJoinAndSelect('n.confederation', 'confed')
        .where('n.name_lg ILIKE :q', { q: `%${term}%` })
        .orWhere('n.name_sh ILIKE :q', { q: `%${term}%` })
        .orWhere('n.name_3l ILIKE :q', { q: `%${term}%` })
        .orWhere('n.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.stadiumRepo
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.nation', 'nation')
        .where('s.name ILIKE :q', { q: `%${term}%` })
        .orWhere('s.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.cityRepo
        .createQueryBuilder('ci')
        .leftJoinAndSelect('ci.nation', 'nation')
        .where('ci.name ILIKE :q', { q: `%${term}%` })
        .orWhere('ci.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.awardRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.nation', 'nation')
        .leftJoinAndSelect('a.competition', 'comp')
        .where('a.name_lg ILIKE :q', { q: `%${term}%` })
        .orWhere('a.name_sh ILIKE :q', { q: `%${term}%` })
        .orWhere('a.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.personRepo
        .createQueryBuilder('p')
        .where('p.first_name ILIKE :q', { q: `%${term}%` })
        .orWhere('p.second_name ILIKE :q', { q: `%${term}%` })
        .orWhere('p.common_name ILIKE :q', { q: `%${term}%` })
        .orWhere("CONCAT(p.first_name, ' ', p.second_name) ILIKE :q", { q: `%${term}%` })
        .orWhere('p.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),

      this.stageRepo
        .createQueryBuilder('st')
        .where('st.name ILIKE :q', { q: `%${term}%` })
        .orWhere('st.id = :idVal', { idVal })
        .limit(limit)
        .getMany(),
    ]);

    return {
      clubs: clubs.map(mapClub),
      competitions: competitions.map((c) => mapCompetition(c)),
      nations: nations.map((n) => mapNation(n)),
      stadiums: stadiums.map(mapStadium),
      cities: cities.map(mapCity),
      awards: awards.map(mapAward),
      players,
      stages,
    };
  }
}
