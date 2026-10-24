import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { paginateAndSort } from './pagination.util';
import {
  PaginationQueryDto,
  NationListFilterDto,
  CompetitionListFilterDto,
  IndependentClubFilterDto,
  CityFilterDto,
} from './dto/pagination.dto';

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

  async getContinents(filter?: PaginationQueryDto) {
    let confeds = await this.confedRepo.find({ order: { id: 'ASC' } });
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const q = searchKey.toLowerCase();
      confeds = confeds.filter(
        (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q),
      );
    }

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

    return paginateAndSort(results, filter);
  }

  async getNationsByContinent(confedId: string, filter?: PaginationQueryDto) {
    let whereClause = 'n.confederation_id = $1';
    const params: any[] = [String(confedId)];
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(n.long_name) LIKE $${params.length} OR LOWER(COALESCE(n.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(n.three_letter_name, '')) LIKE $${params.length} OR CAST(n.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.nationRepo.query(
      `SELECT n.id, n.long_name, n.short_name, n.three_letter_name, n.confederation_id,
        (SELECT COUNT(*) FROM competitions c WHERE c.nation_id = n.id AND (c.parent_id IS NULL OR c.parent_id = ''))::int as total_comps,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.nation_id = n.id)::int as total_clubs,
        (SELECT COUNT(*) FROM stadiums s WHERE s.nation_id = n.id)::int as total_stadiums,
        (SELECT COUNT(*) FROM cities ci WHERE ci.country_id = n.id)::int as total_cities,
        (SELECT COUNT(*) FROM awards a WHERE a.nation_id = n.id AND a.comp_id IS NULL)::int as total_awards
      FROM nations n
      WHERE ${whereClause}
      ORDER BY n.long_name ASC;`,
      params,
    );

    const items = raw.map((r: any) => ({
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

    return paginateAndSort(items, filter);
  }

  async getIntCompetitionsByContinent(confedId: string, filter?: PaginationQueryDto) {
    let whereClause = `c.confed_id = $1 AND (c.is_international = true OR c.nation_id IS NULL) AND (c.parent_id IS NULL OR c.parent_id = '')`;
    const params: any[] = [String(confedId)];
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.long_name) LIKE $${params.length} OR LOWER(COALESCE(c.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.three_letter_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.categories, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

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
      WHERE ${whereClause}
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      params,
    );

    const items = raw.map((r: any) => ({
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

    return paginateAndSort(items, filter);
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
      this.compRepo
        .createQueryBuilder('c')
        .where('c.nation_id = :nid', { nid: String(nationId) })
        .andWhere('(c.parent_id IS NULL OR c.parent_id = :emptyStr)', { emptyStr: '' })
        .getCount(),
      this.clubRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
      this.clubRepo.count({ where: { nation_id: String(nationId) } }),
      this.stadiumRepo.count({ where: { nation_id: String(nationId) } }),
      this.cityRepo.count({ where: { country_id: String(nationId) } }),
      this.awardRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
    ]);

    const countsRaw = await this.clubRepo.query(
      `SELECT
        COUNT(*) FILTER (WHERE comp_id IS NULL AND (is_extinct = false OR is_extinct IS NULL))::int as other_count,
        COUNT(*) FILTER (WHERE is_extinct = true)::int as extinct_count
      FROM clubs
      WHERE nation_id = $1;`,
      [String(nationId)],
    );
    const otherClubsCount = countsRaw[0]?.other_count || 0;
    const extinctClubsCount = countsRaw[0]?.extinct_count || 0;
    const extraComps = (otherClubsCount > 0 ? 1 : 0) + (extinctClubsCount > 0 ? 1 : 0);

    return {
      nation,
      counts: {
        domesticComps: domesticComps + extraComps,
        independentClubs,
        allClubs,
        stadiums,
        cities,
        awards,
      },
    };
  }

  async getDomesticCompetitions(nationId: string, filter?: PaginationQueryDto) {
    const strNationId = String(nationId);
    const nation = await this.nationRepo.findOne({ where: { id: strNationId } });

    let whereClause = `c.nation_id = $1 AND (c.parent_id IS NULL OR c.parent_id = '')`;
    const params: any[] = [strNationId];
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.long_name) LIKE $${params.length} OR LOWER(COALESCE(c.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.three_letter_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.categories, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

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
      WHERE ${whereClause}
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      params,
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

    const virtualItems: any[] = [];
    const qTerm = searchKey.toLowerCase();
    const matchVirtual = (name: string, cat: string) => {
      if (!qTerm) return true;
      return name.toLowerCase().includes(qTerm) || cat.toLowerCase().includes(qTerm);
    };

    if (otherClubsCount > 0 && matchVirtual(virtualOther.long_name, virtualOther.categories)) {
      virtualItems.push(virtualOther);
    }
    if (extinctClubsCount > 0 && matchVirtual(virtualExtinct.long_name, virtualExtinct.categories)) {
      virtualItems.push(virtualExtinct);
    }

    return paginateAndSort([...virtualItems, ...comps], filter);
  }

  async getIndependentClubs(nationId: string, filterOrExtinct?: any, legacyExtinct?: string) {
    const filter: IndependentClubFilterDto =
      typeof filterOrExtinct === 'object' && filterOrExtinct !== null
        ? filterOrExtinct
        : { extinct: filterOrExtinct !== undefined ? filterOrExtinct : legacyExtinct };

    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.nation', 'nation')
      .where('club.nation_id = :nationId', { nationId: String(nationId) });

    const extinct = String(filter.extinct);
    if (extinct === 'true') {
      qb.andWhere('club.is_extinct = true');
    } else if (extinct === 'false') {
      qb.andWhere('club.comp_id IS NULL')
        .andWhere('(club.is_extinct = false OR club.is_extinct IS NULL)');
    } else {
      qb.andWhere('club.comp_id IS NULL');
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(club.long_name) LIKE :term OR LOWER(COALESCE(club.short_name, \'\')) LIKE :term OR LOWER(COALESCE(club.three_letter_name, \'\')) LIKE :term OR CAST(club.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('club.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getAllClubsInNation(nationId: string, filter?: PaginationQueryDto) {
    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.competition', 'competition')
      .leftJoinAndSelect('club.nation', 'nation')
      .where('club.nation_id = :nationId', { nationId: String(nationId) });

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(club.long_name) LIKE :term OR LOWER(COALESCE(club.short_name, \'\')) LIKE :term OR LOWER(COALESCE(club.three_letter_name, \'\')) LIKE :term OR CAST(club.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('club.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getClubsInCompetition(compId: string, filter?: PaginationQueryDto) {
    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.nation', 'nation')
      .where('club.comp_id = :compId', { compId: String(compId) });

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(club.long_name) LIKE :term OR LOWER(COALESCE(club.short_name, \'\')) LIKE :term OR LOWER(COALESCE(club.three_letter_name, \'\')) LIKE :term OR CAST(club.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('club.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getStadiums(nationId: string, filter?: PaginationQueryDto) {
    const qb = this.stadiumRepo
      .createQueryBuilder('stadium')
      .leftJoinAndSelect('stadium.nation', 'nation')
      .where('stadium.nation_id = :nationId', { nationId: String(nationId) });

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(stadium.name) LIKE :term OR CAST(stadium.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('stadium.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getCities(nationId: string, filter?: CityFilterDto) {
    const qb = this.cityRepo
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.nation', 'nation')
      .where('city.country_id = :nationId', { nationId: String(nationId) });

    if (filter?.category && filter.category !== 'all') {
      if (filter.category === '__uncategorized__') {
        qb.andWhere('(city.categories IS NULL OR TRIM(city.categories) = \'\')');
      } else {
        qb.andWhere('city.categories = :cat', { cat: filter.category });
      }
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(city.name) LIKE :term OR LOWER(COALESCE(city.categories, \'\')) LIKE :term OR CAST(city.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('city.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getAwardsByNation(nationId: string, filter?: PaginationQueryDto) {
    const qb = this.awardRepo
      .createQueryBuilder('award')
      .leftJoinAndSelect('award.nation', 'nation')
      .leftJoinAndSelect('award.competition', 'competition')
      .where('award.nation_id = :nationId AND award.comp_id IS NULL', { nationId: String(nationId) });

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(award.long_name) LIKE :term OR LOWER(COALESCE(award.short_name, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getAwardsByCompetition(compId: string, filter?: PaginationQueryDto) {
    const qb = this.awardRepo
      .createQueryBuilder('award')
      .leftJoinAndSelect('award.nation', 'nation')
      .leftJoinAndSelect('award.competition', 'competition')
      .where('award.comp_id = :compId', { compId: String(compId) });

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(award.long_name) LIKE :term OR LOWER(COALESCE(award.short_name, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getCompetitionInfo(compId: string) {
    const strId = String(compId);
    const comp = await this.compRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'confederation', 'parent'],
    });
    if (!comp) {
      throw new NotFoundException(`Competition with ID ${compId} not found`);
    }
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

  async getSubCompetitions(compId: string, filter?: PaginationQueryDto) {
    const strId = String(compId);
    let whereClause = 'c.parent_id = $1';
    const params: any[] = [strId];
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.long_name) LIKE $${params.length} OR LOWER(COALESCE(c.short_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.three_letter_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.categories, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

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
      WHERE ${whereClause}
      ORDER BY c.categories ASC NULLS LAST, c.long_name ASC;`,
      params,
    );

    const items = raw.map((r: any) => ({
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

    return paginateAndSort(items, filter);
  }

  async getAllAwards(filter?: PaginationQueryDto) {
    const qb = this.awardRepo
      .createQueryBuilder('award')
      .leftJoinAndSelect('award.nation', 'nation')
      .leftJoinAndSelect('award.competition', 'competition');

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.where(
        '(LOWER(award.long_name) LIKE :term OR LOWER(COALESCE(award.short_name, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getPlayers(queryOrFilter?: any) {
    const filter =
      typeof queryOrFilter === 'object' && queryOrFilter !== null
        ? queryOrFilter
        : { keyword: queryOrFilter };
    const query = filter.keyword;
    const qb = this.personRepo.createQueryBuilder('p');
    if (query && String(query).trim()) {
      const term = String(query).trim();
      qb.where(
        'p.first_name ILIKE :q OR p.second_name ILIKE :q OR p.common_name ILIKE :q OR CONCAT(p.first_name, \' \', p.second_name) ILIKE :q OR p.id = :term',
        { q: `%${term}%`, term },
      );
    }
    const items = await qb.orderBy('p.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getStages(queryOrFilter?: any) {
    const filter =
      typeof queryOrFilter === 'object' && queryOrFilter !== null
        ? queryOrFilter
        : { keyword: queryOrFilter };
    const query = filter.keyword;
    const qb = this.stageRepo.createQueryBuilder('s');
    if (query && String(query).trim()) {
      const term = String(query).trim();
      qb.where('s.name ILIKE :q OR s.id = :term', {
        q: `%${term}%`,
        term,
      });
    }
    const items = await qb.orderBy('s.id', 'ASC').getMany();
    return paginateAndSort(items, filter);
  }

  async getAllNations(filterOrConfedId?: any, legacyKeyword?: string) {
    const filter: NationListFilterDto =
      typeof filterOrConfedId === 'object' && filterOrConfedId !== null
        ? filterOrConfedId
        : { confedId: filterOrConfedId, keyword: legacyKeyword };

    let whereClause = '1=1';
    const params: any[] = [];
    if (filter.confedId) {
      params.push(String(filter.confedId));
      whereClause += ` AND n.confederation_id = $${params.length}`;
    }
    const searchKey = (filter.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
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

    const items = raw.map((r: any) => ({
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

    return paginateAndSort(items, filter);
  }

  async getAllCompetitions(
    filterOrConfedId?: any,
    legacyNationId?: string,
    legacyKeyword?: string,
    legacyIsInternational?: boolean,
  ) {
    const filter: CompetitionListFilterDto =
      typeof filterOrConfedId === 'object' && filterOrConfedId !== null
        ? filterOrConfedId
        : {
            confedId: filterOrConfedId,
            nationId: legacyNationId,
            keyword: legacyKeyword,
            isInternational: legacyIsInternational,
          };

    let whereClause = '1=1';
    const params: any[] = [];
    if (filter.confedId) {
      params.push(String(filter.confedId));
      whereClause += ` AND c.confed_id = $${params.length}`;
    }
    if (filter.nationId) {
      params.push(String(filter.nationId));
      whereClause += ` AND c.nation_id = $${params.length}`;
    }
    if (filter.isInternational !== undefined) {
      if (filter.isInternational) {
        whereClause += ` AND (c.is_international = true OR c.nation_id IS NULL)`;
      } else {
        whereClause += ` AND (c.is_international = false AND c.nation_id IS NOT NULL)`;
      }
    }
    const searchKey = (filter.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
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

    const items = raw.map((r: any) => ({
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

    return paginateAndSort(items, filter);
  }

  async getContinentInfo(confedId: string) {
    const strId = String(confedId);
    const confed = await this.confedRepo.findOne({ where: { id: strId } });
    if (!confed) {
      throw new NotFoundException(`Confederation with ID ${confedId} not found`);
    }

    const [totalNations, totalIntComps, totalComps, totalClubs, totalStadiums, totalCities, totalAwards] =
      await Promise.all([
        this.nationRepo.count({ where: { confederation_id: strId } }),
        this.compRepo
          .createQueryBuilder('comp')
          .where('comp.confed_id = :cid', { cid: strId })
          .andWhere('(comp.is_international = true OR comp.nation_id IS NULL)')
          .andWhere('(comp.parent_id IS NULL OR comp.parent_id = \'\')')
          .getCount(),
        this.compRepo
          .createQueryBuilder('comp')
          .leftJoin('comp.nation', 'nation')
          .where('comp.confed_id = :cid OR nation.confederation_id = :cid', { cid: strId })
          .getCount(),
        this.clubRepo
          .createQueryBuilder('club')
          .innerJoin('club.nation', 'nation')
          .where('nation.confederation_id = :cid', { cid: strId })
          .getCount(),
        this.stadiumRepo
          .createQueryBuilder('stadium')
          .innerJoin('stadium.nation', 'nation')
          .where('nation.confederation_id = :cid', { cid: strId })
          .getCount(),
        this.cityRepo
          .createQueryBuilder('city')
          .innerJoin('city.nation', 'nation')
          .where('nation.confederation_id = :cid', { cid: strId })
          .getCount(),
        this.awardRepo
          .createQueryBuilder('award')
          .innerJoin('award.nation', 'nation')
          .where('nation.confederation_id = :cid', { cid: strId })
          .getCount(),
      ]);

    return {
      ...confed,
      totalNations,
      totalIntComps,
      totalComps,
      totalClubs,
      totalStadiums,
      totalCities,
      totalAwards,
    };
  }

  async getNationInfo(nationId: string) {
    const strId = String(nationId);
    const nation = await this.nationRepo.findOne({
      where: { id: strId },
      relations: ['confederation'],
    });
    if (!nation) {
      throw new NotFoundException(`Nation with ID ${nationId} not found`);
    }

    const [
      domesticComps,
      totalComps,
      independentClubs,
      extinctClubs,
      allClubs,
      stadiums,
      cities,
      awards,
      totalAwards,
    ] = await Promise.all([
      this.compRepo
        .createQueryBuilder('c')
        .where('c.nation_id = :nid', { nid: strId })
        .andWhere('(c.parent_id IS NULL OR c.parent_id = :emptyStr)', { emptyStr: '' })
        .getCount(),
      this.compRepo.count({ where: { nation_id: strId } }),
      this.clubRepo
        .createQueryBuilder('c')
        .where('c.nation_id = :nid', { nid: strId })
        .andWhere('c.comp_id IS NULL')
        .andWhere('(c.is_extinct = false OR c.is_extinct IS NULL)')
        .getCount(),
      this.clubRepo.count({ where: { nation_id: strId, is_extinct: true } }),
      this.clubRepo.count({ where: { nation_id: strId } }),
      this.stadiumRepo.count({ where: { nation_id: strId } }),
      this.cityRepo.count({ where: { country_id: strId } }),
      this.awardRepo.count({ where: { nation_id: strId, comp_id: IsNull() } }),
      this.awardRepo.count({ where: { nation_id: strId } }),
    ]);

    return {
      ...nation,
      confederation_name: nation.confederation?.name || null,
      counts: {
        domesticComps: domesticComps + 2, // +2 cho [OTHER] và [EXTINCT]
        parentComps: domesticComps,
        totalComps,
        independentClubs,
        extinctClubs,
        allClubs,
        stadiums,
        cities,
        awards,
        totalAwards,
      },
    };
  }

  async getClubInfo(clubId: string) {
    const strId = String(clubId);
    const club = await this.clubRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'competition', 'competition.parent'],
    });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    return {
      ...club,
      competition_name: club.competition?.short_name || club.competition?.long_name || null,
      parent_competition_name:
        club.competition?.parent?.short_name || club.competition?.parent?.long_name || null,
      nation_name: club.nation?.long_name || null,
      nation_three_letter: club.nation?.three_letter_name || null,
    };
  }

  async getCityInfo(cityId: string) {
    const strId = String(cityId);
    const city = await this.cityRepo.findOne({
      where: { id: strId },
      relations: ['nation'],
    });
    if (!city) {
      throw new NotFoundException(`City with ID ${cityId} not found`);
    }

    return {
      ...city,
      nation_name: city.nation?.long_name || null,
      nation_three_letter: city.nation?.three_letter_name || null,
    };
  }

  async getAwardInfo(awardId: string) {
    const strId = String(awardId);
    const award = await this.awardRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'competition'],
    });
    if (!award) {
      throw new NotFoundException(`Award with ID ${awardId} not found`);
    }

    return {
      ...award,
      nation_name: award.nation?.long_name || null,
      nation_three_letter: award.nation?.three_letter_name || null,
      competition_name: award.competition?.short_name || award.competition?.long_name || null,
    };
  }

  async getStadiumInfo(stadiumId: string) {
    const strId = String(stadiumId);
    const stadium = await this.stadiumRepo.findOne({
      where: { id: strId },
      relations: ['nation'],
    });
    if (!stadium) {
      throw new NotFoundException(`Stadium with ID ${stadiumId} not found`);
    }

    return {
      ...stadium,
      nation_name: stadium.nation?.long_name || null,
      nation_three_letter: stadium.nation?.three_letter_name || null,
    };
  }

  async getEntityInfo(type: string, id: string) {
    switch (type.toLowerCase()) {
      case 'confederation':
      case 'confederations':
      case 'continent':
      case 'continents':
        return this.getContinentInfo(id);
      case 'nation':
      case 'nations':
        return this.getNationInfo(id);
      case 'competition':
      case 'competitions':
      case 'comp':
      case 'comps':
        return this.getCompetitionInfo(id);
      case 'club':
      case 'clubs':
        return this.getClubInfo(id);
      case 'city':
      case 'cities':
        return this.getCityInfo(id);
      case 'award':
      case 'awards':
        return this.getAwardInfo(id);
      case 'stadium':
      case 'stadiums':
        return this.getStadiumInfo(id);
      default:
        throw new BadRequestException(`Info not supported for entity type: ${type}`);
    }
  }
}

