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
          where: { confederation_id: String(c.id) },
        });

        // Count international competitions for this confederation
        const totalIntComps = await this.compRepo
          .createQueryBuilder('comp')
          .where('comp.confed_id = :cid', { cid: String(c.id) })
          .andWhere('(comp.is_international = true OR comp.nation_id IS NULL)')
          .getCount();

        return {
          id: String(c.id),
          name: c.name,
          totalNations,
          totalIntComps,
        };
      }),
    );

    return results;
  }

  async getNationsByContinent(confedId: string) {
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
      [String(confedId)],
    );

    return raw.map((r: any) => ({
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      confederation_id: r.confederation_id ? String(r.confederation_id) : null,
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

  async getIntCompetitionsByContinent(confedId: string) {
    const raw = await this.compRepo.query(
      `SELECT c.*,
        n.three_letter_name as nation_three_letter,
        n.long_name as nation_name,
        p.long_name as parent_long_name,
        p.short_name as parent_short_name,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE c.confed_id = $1 AND (c.is_international = true OR c.nation_id IS NULL)
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      [String(confedId)],
    );

    return raw.map((r: any) => ({
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? String(r.confed_id) : null,
      nation_id: r.nation_id ? String(r.nation_id) : null,
      nation_name: r.nation_name,
      nation_three_letter: r.nation_three_letter,
      parent_id: r.parent_id ? String(r.parent_id) : null,
      parent_name: r.parent_short_name || r.parent_long_name || null,
      parent_long_name: r.parent_long_name || null,
      parent_short_name: r.parent_short_name || null,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      childrenCount: r.children_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));
  }

  async getNationHub(nationId: string) {
    const nation = await this.nationRepo.findOne({
      where: { id: String(nationId) },
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
      this.compRepo.count({ where: { nation_id: String(nationId) } }),
      this.clubRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
      this.clubRepo.count({ where: { nation_id: String(nationId) } }),
      this.stadiumRepo.count({ where: { nation_id: String(nationId) } }),
      this.cityRepo.count({ where: { country_id: String(nationId) } }),
      this.awardRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
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

  async getDomesticCompetitions(nationId: string) {
    const strNationId = String(nationId);
    const nation = await this.nationRepo.findOne({ where: { id: strNationId } });

    const raw = await this.compRepo.query(
      `SELECT c.*,
        n.three_letter_name as nation_three_letter,
        n.long_name as nation_name,
        p.long_name as parent_long_name,
        p.short_name as parent_short_name,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE c.nation_id = $1
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      [strNationId],
    );

    const comps = raw.map((r: any) => ({
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? String(r.confed_id) : null,
      nation_id: r.nation_id ? String(r.nation_id) : null,
      nation_name: r.nation_name || nation?.long_name,
      nation_three_letter: r.nation_three_letter || nation?.three_letter_name,
      parent_id: r.parent_id ? String(r.parent_id) : null,
      parent_name: r.parent_short_name || r.parent_long_name || null,
      parent_long_name: r.parent_long_name || null,
      parent_short_name: r.parent_short_name || null,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      childrenCount: r.children_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));

    const countsRaw = await this.clubRepo.query(
      `SELECT
        COUNT(*) FILTER (WHERE comp_id IS NULL AND (is_extinct = false OR is_extinct IS NULL))::int as other_count,
        COUNT(*) FILTER (WHERE is_extinct = true)::int as extinct_count
      FROM clubs
      WHERE nation_id = $1;`,
      [strNationId],
    );

    const otherClubsCount = countsRaw[0]?.other_count || 0;
    const extinctClubsCount = countsRaw[0]?.extinct_count || 0;

    const virtualOther = {
      id: '[OTHER]',
      long_name: '[OTHER] Other Clubs',
      short_name: 'Other Clubs',
      three_letter_name: 'OTH',
      categories: 'Other',
      nation_id: strNationId,
      nation_name: nation?.long_name,
      nation_three_letter: nation?.three_letter_name,
      is_virtual: true,
      virtual_type: 'OTHER',
      clubsCount: otherClubsCount,
      awardsCount: 0,
      childrenCount: 0,
      totalChildren: otherClubsCount,
    };

    const virtualExtinct = {
      id: '[EXTINCT]',
      long_name: '[EXTINCT] Extinct Clubs',
      short_name: 'Extinct Clubs',
      three_letter_name: 'EXT',
      categories: 'Other',
      nation_id: strNationId,
      nation_name: nation?.long_name,
      nation_three_letter: nation?.three_letter_name,
      is_virtual: true,
      virtual_type: 'EXTINCT',
      clubsCount: extinctClubsCount,
      awardsCount: 0,
      childrenCount: 0,
      totalChildren: extinctClubsCount,
    };

    return [virtualOther, virtualExtinct, ...comps];
  }

  async getIndependentClubs(nationId: string, extinct?: string) {
    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.nation', 'nation')
      .where('club.nation_id = :nationId', { nationId: String(nationId) });

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

  async getAllClubsInNation(nationId: string) {
    return this.clubRepo.find({
      where: { nation_id: String(nationId) },
      relations: ['competition', 'nation'],
      order: { id: 'ASC' },
    });
  }

  async getClubsInCompetition(compId: string) {
    return this.clubRepo.find({
      where: { comp_id: String(compId) },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getStadiums(nationId: string) {
    return this.stadiumRepo.find({
      where: { nation_id: String(nationId) },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getCities(nationId: string) {
    return this.cityRepo.find({
      where: { country_id: String(nationId) },
      relations: ['nation'],
      order: { id: 'ASC' },
    });
  }

  async getAwardsByNation(nationId: string) {
    return this.awardRepo.find({
      where: { nation_id: String(nationId), comp_id: IsNull() },
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
  }

  async getAwardsByCompetition(compId: string) {
    return this.awardRepo.find({
      where: { comp_id: String(compId) },
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
  }

  async getCompetitionInfo(compId: string) {
    const strId = String(compId);
    const comp = await this.compRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'confederation', 'parent'],
    });
    if (!comp) return null;
    const [clubsCount, awardsCount, childrenCount] = await Promise.all([
      this.clubRepo.count({ where: { comp_id: strId } }),
      this.awardRepo.count({ where: { comp_id: strId } }),
      this.compRepo.count({ where: { parent_id: strId } }),
    ]);
    return {
      ...comp,
      parent_name: comp.parent?.short_name || comp.parent?.long_name || null,
      parent_long_name: comp.parent?.long_name || null,
      parent_short_name: comp.parent?.short_name || null,
      clubsCount,
      awardsCount,
      childrenCount,
    };
  }

  async getSubCompetitions(compId: string) {
    const strId = String(compId);
    const raw = await this.compRepo.query(
      `SELECT c.*,
        n.three_letter_name as nation_three_letter,
        n.long_name as nation_name,
        p.long_name as parent_long_name,
        p.short_name as parent_short_name,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE c.parent_id = $1
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      [strId],
    );

    return raw.map((r: any) => ({
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? String(r.confed_id) : null,
      nation_id: r.nation_id ? String(r.nation_id) : null,
      nation_name: r.nation_name,
      nation_three_letter: r.nation_three_letter,
      parent_id: r.parent_id ? String(r.parent_id) : null,
      parent_name: r.parent_short_name || r.parent_long_name || null,
      parent_long_name: r.parent_long_name || null,
      parent_short_name: r.parent_short_name || null,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      childrenCount: r.children_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));
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
      qb.where(
        'p.first_name ILIKE :q OR p.second_name ILIKE :q OR p.common_name ILIKE :q OR CONCAT(p.first_name, \' \', p.second_name) ILIKE :q OR p.id = :term',
        { q: `%${term}%`, term },
      );
    }
    return qb.orderBy('p.id', 'ASC').getMany();
  }

  async getStages(query?: string) {
    const qb = this.stageRepo.createQueryBuilder('s');
    if (query && query.trim()) {
      const term = query.trim();
      qb.where('s.name ILIKE :q OR s.id = :term', {
        q: `%${term}%`,
        term,
      });
    }
    return qb.orderBy('s.id', 'ASC').getMany();
  }

  async getAllNations(confedId?: string, q?: string) {
    let whereClause = '1=1';
    const params: any[] = [];
    if (confedId) {
      params.push(String(confedId));
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
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      confederation_id: r.confederation_id ? String(r.confederation_id) : null,
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

  async getAllCompetitions(confedId?: string, nationId?: string, q?: string, isInternational?: boolean) {
    let whereClause = '1=1';
    const params: any[] = [];
    if (confedId) {
      params.push(String(confedId));
      whereClause += ` AND c.confed_id = $${params.length}`;
    }
    if (nationId) {
      params.push(String(nationId));
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
        p.long_name as parent_long_name,
        p.short_name as parent_short_name,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN confederations conf ON c.confed_id = conf.id
      LEFT JOIN nations n ON c.nation_id = n.id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE ${whereClause}
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      params,
    );

    return raw.map((r: any) => ({
      id: String(r.id),
      long_name: r.long_name,
      short_name: r.short_name,
      three_letter_name: r.three_letter_name,
      fg_color: r.fg_color,
      bg_color: r.bg_color,
      confed_id: r.confed_id ? String(r.confed_id) : null,
      confed_name: r.confed_name,
      nation_id: r.nation_id ? String(r.nation_id) : null,
      nation_name: r.nation_name,
      nation_three_letter: r.nation_three_letter,
      parent_id: r.parent_id ? String(r.parent_id) : null,
      parent_name: r.parent_short_name || r.parent_long_name || null,
      parent_long_name: r.parent_long_name || null,
      parent_short_name: r.parent_short_name || null,
      categories: r.categories,
      is_international: r.is_international,
      note: r.note,
      inactive_fields: r.inactive_fields,
      clubsCount: r.clubs_count || 0,
      awardsCount: r.awards_count || 0,
      childrenCount: r.children_count || 0,
      totalChildren: (r.clubs_count || 0) + (r.awards_count || 0),
    }));
  }
}
