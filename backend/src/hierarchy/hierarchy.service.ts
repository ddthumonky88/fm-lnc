import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  Confederation,
  Nation,
  Competition,
  Club,
  Stadium,
  City,
  Award,
  Person,
  Stage,
} from '../entities';

@Injectable()
export class HierarchyService {
  constructor(
    @InjectRepository(Confederation) private confedRepo: Repository<Confederation>,
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
  ) {}

  async getContinents() {
    const confeds = await this.confedRepo.find({ order: { id: 'ASC' } });

    const results = await Promise.all(
      confeds.map(async (c) => {
        const totalNations = await this.nationRepo.count({
          where: { confederation_id: c.id },
        });

        // Count international competitions for this confederation
        const totalIntComps = await this.compRepo
          .createQueryBuilder('comp')
          .where('comp.confed_id = :cid', { cid: c.id })
          .andWhere('(comp.is_international = true OR comp.nation_id IS NULL)')
          .getCount();

        return {
          id: c.id,
          name: c.name,
          totalNations,
          totalIntComps,
        };
      }),
    );

    return results;
  }

  async getNationsByContinent(confedId: number) {
    const raw = await this.nationRepo.query(
      `SELECT n.id, n.long_name, n.short_name, n.three_letter_name, n.confederation_id,
        (SELECT COUNT(*) FROM competitions c WHERE c.nation_id = n.id)::int as total_comps,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.nation_id = n.id)::int as total_clubs,
        (SELECT COUNT(*) FROM stadiums s WHERE s.nation_id = n.id)::int as total_stadiums,
        (SELECT COUNT(*) FROM cities ci WHERE ci.country_id = n.id)::int as total_cities,
        (SELECT COUNT(*) FROM awards a WHERE a.nation_id = n.id AND a.comp_id IS NULL)::int as total_awards
      FROM nations n
      WHERE n.confederation_id = $1
      ORDER BY n.long_name ASC;`,
      [confedId],
    );

    return raw.map((r: any) => ({
      id: Number(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      confederation_id: Number(r.confederation_id),
      totalComps: r.total_comps || 0,
      totalClubs: r.total_clubs || 0,
      totalStadiums: r.total_stadiums || 0,
      totalCities: r.total_cities || 0,
      totalAwards: r.total_awards || 0,
      totalChildren:
        (r.total_comps || 0) +
        (r.total_clubs || 0) +
        (r.total_stadiums || 0) +
        (r.total_cities || 0) +
        (r.total_awards || 0),
    }));
  }

  async getIntCompetitionsByContinent(confedId: number) {
    const raw = await this.compRepo.query(
      `SELECT c.*,
        n.three_letter_name as nation_three_letter,
        n.long_name as nation_name,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN nations n ON n.id = c.nation_id
      WHERE c.confed_id = $1 AND (c.is_international = true OR c.nation_id IS NULL)
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      [confedId],
    );

    return raw.map((r: any) => ({
      id: Number(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? Number(r.confed_id) : null,
      nation_id: r.nation_id ? Number(r.nation_id) : null,
      nation_name: r.nation_name,
      nation_three_letter: r.nation_three_letter,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));
  }

  async getNationHub(nationId: number) {
    const nation = await this.nationRepo.findOne({
      where: { id: nationId },
      relations: ['confederation'],
    });

    if (!nation) return null;

    const [
      domesticComps,
      independentClubs,
      allClubs,
      stadiums,
      cities,
      awards,
    ] = await Promise.all([
      this.compRepo.count({ where: { nation_id: nationId } }),
      this.clubRepo.count({ where: { nation_id: nationId, comp_id: IsNull() } }),
      this.clubRepo.count({ where: { nation_id: nationId } }),
      this.stadiumRepo.count({ where: { nation_id: nationId } }),
      this.cityRepo.count({ where: { country_id: nationId } }),
      this.awardRepo.count({ where: { nation_id: nationId, comp_id: IsNull() } }),
    ]);

    return {
      nation,
      counts: {
        domesticComps: domesticComps + 2,
        independentClubs,
        allClubs,
        stadiums,
        cities,
        awards,
      },
    };
  }

  async getDomesticCompetitions(nationId: number) {
    const nation = await this.nationRepo.findOne({ where: { id: nationId } });

    const raw = await this.compRepo.query(
      `SELECT c.*,
        n.three_letter_name as nation_three_letter,
        n.long_name as nation_name,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN nations n ON n.id = c.nation_id
      WHERE c.nation_id = $1
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      [nationId],
    );

    const comps = raw.map((r: any) => ({
      id: Number(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? Number(r.confed_id) : null,
      nation_id: r.nation_id ? Number(r.nation_id) : null,
      nation_name: r.nation_name || nation?.long_name,
      nation_three_letter: r.nation_three_letter || nation?.three_letter_name,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));

    const countsRaw = await this.clubRepo.query(
      `SELECT
        COUNT(*) FILTER (WHERE comp_id IS NULL AND (is_extinct = false OR is_extinct IS NULL))::int as other_count,
        COUNT(*) FILTER (WHERE is_extinct = true)::int as extinct_count
      FROM clubs
      WHERE nation_id = $1;`,
      [nationId],
    );

    const otherClubsCount = countsRaw[0]?.other_count || 0;
    const extinctClubsCount = countsRaw[0]?.extinct_count || 0;

    const virtualOther = {
      id: '[OTHER]',
      long_name: '[OTHER] Other Clubs',
      short_name: 'Other Clubs',
      three_letter_name: 'OTH',
      categories: 'Other',
      nation_id: Number(nationId),
      nation_name: nation?.long_name,
      nation_three_letter: nation?.three_letter_name,
      is_virtual: true,
      virtual_type: 'OTHER',
      clubsCount: otherClubsCount,
      awardsCount: 0,
      totalChildren: otherClubsCount,
    };

    const virtualExtinct = {
      id: '[EXTINCT]',
      long_name: '[EXTINCT] Extinct Clubs',
      short_name: 'Extinct Clubs',
      three_letter_name: 'EXT',
      categories: 'Other',
      nation_id: Number(nationId),
      nation_name: nation?.long_name,
      nation_three_letter: nation?.three_letter_name,
      is_virtual: true,
      virtual_type: 'EXTINCT',
      clubsCount: extinctClubsCount,
      awardsCount: 0,
      totalChildren: extinctClubsCount,
    };

    return [virtualOther, virtualExtinct, ...comps];
  }

  async getIndependentClubs(nationId: number, extinct?: string) {
    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.nation', 'nation')
      .where('club.nation_id = :nationId', { nationId });

    if (extinct === 'true') {
      qb.andWhere('club.is_extinct = true');
    } else if (extinct === 'false') {
      qb.andWhere('club.comp_id IS NULL')
        .andWhere('(club.is_extinct = false OR club.is_extinct IS NULL)');
    } else {
      qb.andWhere('club.comp_id IS NULL');
    }

    return qb.orderBy('club.id', 'ASC').getMany();
  }

  async getAllClubsInNation(nationId: number) {
    return this.clubRepo.find({
      where: { nation_id: nationId },
      relations: ['competition', 'nation'],
      order: { id: 'ASC' },
    });
  }

  async getClubsInCompetition(compId: number) {
    return this.clubRepo.find({
      where: { comp_id: compId },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getStadiums(nationId: number) {
    return this.stadiumRepo.find({
      where: { nation_id: nationId },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getCities(nationId: number) {
    return this.cityRepo.find({
      where: { country_id: nationId },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getAwardsByNation(nationId: number) {
    return this.awardRepo.find({
      where: { nation_id: nationId, comp_id: IsNull() },
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
  }

  async getAwardsByCompetition(compId: number) {
    return this.awardRepo.find({
      where: { comp_id: compId },
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
  }

  async getCompetitionInfo(compId: number) {
    const comp = await this.compRepo.findOne({
      where: { id: compId },
      relations: ['nation', 'confederation'],
    });
    if (!comp) return null;
    const [clubsCount, awardsCount] = await Promise.all([
      this.clubRepo.count({ where: { comp_id: compId } }),
      this.awardRepo.count({ where: { comp_id: compId } }),
    ]);
    return {
      ...comp,
      clubsCount,
      awardsCount,
    };
  }

  async getAllAwards() {
    return this.awardRepo.find({
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
  }

  async getPlayers(query?: string) {
    const qb = this.personRepo.createQueryBuilder('p');
    if (query && query.trim()) {
      const term = query.trim();
      const isId = /^\d+$/.test(term);
      const idVal = isId ? parseInt(term, 10) : -1;
      qb.where(
        'p.first_name ILIKE :q OR p.second_name ILIKE :q OR p.common_name ILIKE :q OR CONCAT(p.first_name, \' \', p.second_name) ILIKE :q OR p.id = :idVal',
        { q: `%${term}%`, idVal },
      );
    }
    return qb.orderBy('p.id', 'ASC').getMany();
  }

  async getStages(query?: string) {
    const qb = this.stageRepo.createQueryBuilder('s');
    if (query && query.trim()) {
      const term = query.trim();
      const isId = /^\d+$/.test(term);
      const idVal = isId ? parseInt(term, 10) : -1;
      qb.where('s.name ILIKE :q OR s.id = :idVal', {
        q: `%${term}%`,
        idVal,
      });
    }
    return qb.orderBy('s.id', 'ASC').getMany();
  }

  async getAllNations(confedId?: number, q?: string) {
    let whereClause = '1=1';
    const params: any[] = [];
    if (confedId) {
      params.push(confedId);
      whereClause += ` AND n.confederation_id = $${params.length}`;
    }
    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(n.long_name) LIKE $${params.length} OR LOWER(COALESCE(n.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(n.three_letter_name, '')) LIKE $${params.length} OR CAST(n.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.nationRepo.query(
      `SELECT n.id, n.long_name, n.short_name, n.three_letter_name, n.confederation_id, conf.name as confederation_name,
        (SELECT COUNT(*) FROM competitions c WHERE c.nation_id = n.id)::int as total_comps,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.nation_id = n.id)::int as total_clubs,
        (SELECT COUNT(*) FROM stadiums s WHERE s.nation_id = n.id)::int as total_stadiums,
        (SELECT COUNT(*) FROM cities ci WHERE ci.country_id = n.id)::int as total_cities,
        (SELECT COUNT(*) FROM awards a WHERE a.nation_id = n.id AND a.comp_id IS NULL)::int as total_awards
      FROM nations n
      LEFT JOIN confederations conf ON n.confederation_id = conf.id
      WHERE ${whereClause}
      ORDER BY n.long_name ASC;`,
      params,
    );

    return raw.map((r: any) => ({
      id: Number(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      confederation_id: r.confederation_id ? Number(r.confederation_id) : null,
      confederation_name: r.confederation_name,
      totalComps: r.total_comps || 0,
      totalClubs: r.total_clubs || 0,
      totalStadiums: r.total_stadiums || 0,
      totalCities: r.total_cities || 0,
      totalAwards: r.total_awards || 0,
      totalChildren:
        (r.total_comps || 0) +
        (r.total_clubs || 0) +
        (r.total_stadiums || 0) +
        (r.total_cities || 0) +
        (r.total_awards || 0),
    }));
  }

  async getAllCompetitions(confedId?: number, nationId?: number, q?: string, isInternational?: boolean) {
    let whereClause = '1=1';
    const params: any[] = [];
    if (confedId) {
      params.push(confedId);
      whereClause += ` AND c.confed_id = $${params.length}`;
    }
    if (nationId) {
      params.push(nationId);
      whereClause += ` AND c.nation_id = $${params.length}`;
    }
    if (isInternational !== undefined) {
      if (isInternational) {
        whereClause += ` AND (c.is_international = true OR c.nation_id IS NULL)`;
      } else {
        whereClause += ` AND (c.is_international = false AND c.nation_id IS NOT NULL)`;
      }
    }
    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.long_name) LIKE $${params.length} OR LOWER(COALESCE(c.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.three_letter_name, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.compRepo.query(
      `SELECT c.*,
        conf.name as confed_name,
        n.long_name as nation_name,
        n.three_letter_name as nation_three_letter,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN confederations conf ON c.confed_id = conf.id
      LEFT JOIN nations n ON c.nation_id = n.id
      WHERE ${whereClause}
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      params,
    );

    return raw.map((r: any) => ({
      id: Number(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? Number(r.confed_id) : null,
      confed_name: r.confed_name,
      nation_id: r.nation_id ? Number(r.nation_id) : null,
      nation_name: r.nation_name,
      nation_three_letter: r.nation_three_letter,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));
  }
}
