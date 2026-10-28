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
  Region,
} from '../entities';
import { paginateAndSort } from './pagination.util';
import {
  PaginationQueryDto,
  SearchFilterDto,
  NationListFilterDto,
  IntCompetitionFilterDto,
  DomesticCompetitionFilterDto,
  CityFilterDto,
  ClubSearchQueryDto,
} from './dto/pagination.dto';
import {
  mapNation,
  mapCompetition,
  mapClub,
  mapCity,
  mapStadium,
  mapAward,
  mapNationRef,
} from '../common/entity-mapper';

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
    @InjectRepository(Region) private regionRepo: Repository<Region>,
  ) {}

  async getListConfederations(filter?: SearchFilterDto) {
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
          where: { confed_id: String(c.id) },
        });

        // Count international competitions for this confederation
        const totalIntComps = await this.compRepo
          .createQueryBuilder('comp')
          .where('comp.confed_id = :cid', { cid: String(c.id) })
          .andWhere('comp.nation_id IS NULL')
          .getCount();

        return {
          id: String(c.id),
          name: c.name,
          stats: {
            nations: totalNations,
            intComps: totalIntComps,
          },
        };
      }),
    );

    return results;
  }

  async getIntCompetitions(filterOrConfedId?: any, legacyKeyword?: string) {
    const filter: IntCompetitionFilterDto =
      typeof filterOrConfedId === 'object' && filterOrConfedId !== null
        ? filterOrConfedId
        : { confedId: filterOrConfedId, keyword: legacyKeyword };

    let whereClause = `c.nation_id IS NULL AND (c.parent_id IS NULL OR c.parent_id = '')`;
    const params: any[] = [];
    if (
      filter.confedId !== undefined &&
      filter.confedId !== null &&
      String(filter.confedId).trim() !== '' &&
      String(filter.confedId).toLowerCase() !== 'all' &&
      String(filter.confedId).toLowerCase() !== 'null' &&
      String(filter.confedId).toLowerCase() !== 'undefined'
    ) {
      params.push(String(filter.confedId));
      whereClause += ` AND c.confed_id = $${params.length}`;
    }

    const searchKey = (filter.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.name_lg) LIKE $${params.length} OR LOWER(COALESCE(c.name_sh, '')) LIKE $${params.length} OR LOWER(COALESCE(c.name_3l, '')) LIKE $${params.length} OR LOWER(COALESCE(c.type, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.compRepo.query(
      `SELECT c.*,
        conf.name as confed_name,
        n.name_3l as nation_three_letter,
        n.name_lg as nation_long_name,
        n.name_sh as nation_short_name,
        p.name_lg as parent_long_name,
        p.name_sh as parent_short_name,
        p.name_3l as parent_three_letter,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN confederations conf ON conf.id = c.confed_id
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE ${whereClause}
      ORDER BY c.type ASC NULLS LAST, c.name_lg ASC;`,
      params,
    );

    const items = raw.map((r: any) =>
      mapCompetition(r, {
        children: (r.clubs_count || 0) + (r.awards_count || 0),
      }),
    );

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
      regions,
    ] = await Promise.all([
      this.compRepo
        .createQueryBuilder('c')
        .where('c.nation_id = :nid', { nid: String(nationId) })
        .andWhere('(c.parent_id IS NULL OR c.parent_id = :emptyStr)', { emptyStr: '' })
        .getCount(),
      this.clubRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
      this.clubRepo.count({ where: { nation_id: String(nationId) } }),
      this.stadiumRepo.count({ where: { nation_id: String(nationId) } }),
      this.cityRepo.count({ where: { nation_id: String(nationId) } }),
      this.awardRepo.count({ where: { nation_id: String(nationId), comp_id: IsNull() } }),
      this.regionRepo.count({ where: { nation_id: String(nationId) } }),
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
    const extraComps = 2;

    return {
      nation: mapNation(nation),
      stats: {
        domesticComps: domesticComps + extraComps,
        independentClubs,
        allClubs,
        stadiums,
        cities,
        awards,
        regions: regions || 0,
      },
      counts: {
        domesticComps: domesticComps + extraComps,
        independentClubs,
        allClubs,
        stadiums,
        cities,
        awards,
        regions: regions || 0,
      },
    };
  }

  async getDomesticCompetitions(nationIdOrFilter?: any, legacyFilter?: PaginationQueryDto) {
    let nationId: string | null = null;
    let filter: any = {};

    if (typeof nationIdOrFilter === 'object' && nationIdOrFilter !== null) {
      filter = { ...nationIdOrFilter };
      nationId = filter.nationId;
    } else {
      nationId = nationIdOrFilter;
      filter = legacyFilter || {};
    }

    const hasNation =
      nationId !== undefined &&
      nationId !== null &&
      String(nationId).trim() !== '' &&
      String(nationId).toLowerCase() !== 'all' &&
      String(nationId).toLowerCase() !== 'null' &&
      String(nationId).toLowerCase() !== 'undefined';

    const strNationId = hasNation ? String(nationId) : null;
    const nation = strNationId
      ? await this.nationRepo.findOne({
          where: { id: strNationId },
          relations: ['confederation'],
        })
      : null;

    let whereClause = `(c.parent_id IS NULL OR c.parent_id = '')`;
    const params: any[] = [];
    if (strNationId) {
      params.push(strNationId);
      whereClause += ` AND c.nation_id = $${params.length}`;
    } else {
      whereClause += ` AND c.nation_id IS NOT NULL`;
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.name_lg) LIKE $${params.length} OR LOWER(COALESCE(c.name_sh, '')) LIKE $${params.length} OR LOWER(COALESCE(c.name_3l, '')) LIKE $${params.length} OR LOWER(COALESCE(c.type, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.compRepo.query(
      `SELECT c.*,
        conf.name as confed_name,
        n.name_3l as nation_three_letter,
        n.name_lg as nation_long_name,
        n.name_sh as nation_short_name,
        p.name_lg as parent_long_name,
        p.name_sh as parent_short_name,
        p.name_3l as parent_three_letter,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN confederations conf ON conf.id = c.confed_id
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE ${whereClause}
      ORDER BY c.type ASC NULLS LAST, c.name_lg ASC;`,
      params,
    );

    const comps = raw.map((r: any) =>
      mapCompetition(
        {
          ...r,
          nation: r.nation_id ? r.nation : nation,
        },
        {
          children: (r.clubs_count || 0) + (r.awards_count || 0),
        },
      ),
    );

    if (!strNationId) {
      return paginateAndSort(comps, filter);
    }

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

    const nationRef = mapNationRef(nation) || {
      id: strNationId,
      name_lg: null,
      name_sh: null,
      name_3l: null,
    };

    const virtualOther = {
      id: `oth-${strNationId}`,
      name_lg: '[OTHER] Other Clubs',
      name_sh: 'Other Clubs',
      name_3l: 'OTH',
      type: 'Other',
      categories: 'Other',
      nation: nationRef,
      confed: null,
      parent: null,
      is_virtual: true,
      virtual_type: 'OTHER',
      clubsCount: otherClubsCount,
      awardsCount: 0,
      childrenCount: 0,
      stats: {
        children: otherClubsCount,
      },
    };

    const virtualExtinct = {
      id: `ext-${strNationId}`,
      name_lg: '[EXTINCT] Extinct Clubs',
      name_sh: 'Extinct Clubs',
      name_3l: 'EXT',
      type: 'Other',
      categories: 'Other',
      nation: nationRef,
      confed: null,
      parent: null,
      is_virtual: true,
      virtual_type: 'EXTINCT',
      clubsCount: extinctClubsCount,
      awardsCount: 0,
      childrenCount: 0,
      stats: {
        children: extinctClubsCount,
      },
    };

    const virtualItems: any[] = [];
    const qTerm = searchKey.toLowerCase();
    const matchVirtual = (name: string, cat: string) => {
      if (!qTerm) return true;
      return (
        name.toLowerCase().includes(qTerm) ||
        cat.toLowerCase().includes(qTerm) ||
        'other'.includes(qTerm) ||
        'extinct'.includes(qTerm)
      );
    };

    if (matchVirtual(virtualOther.name_lg, virtualOther.type || virtualOther.categories)) {
      virtualItems.push(virtualOther);
    }
    if (matchVirtual(virtualExtinct.name_lg, virtualExtinct.type || virtualExtinct.categories)) {
      virtualItems.push(virtualExtinct);
    }

    return paginateAndSort([...virtualItems, ...comps], filter);
  }

  async searchClubs(filter: ClubSearchQueryDto) {
    const qb = this.clubRepo
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.competition', 'competition')
      .leftJoinAndSelect('club.nation', 'nation')
      .leftJoinAndSelect('club.parent', 'parent');

    const nationId =
      filter?.nationId !== undefined &&
      filter?.nationId !== null &&
      String(filter.nationId).trim() !== '' &&
      String(filter.nationId).toLowerCase() !== 'all' &&
      String(filter.nationId).toLowerCase() !== 'null' &&
      String(filter.nationId).toLowerCase() !== 'undefined'
        ? String(filter.nationId).trim()
        : null;

    const compId =
      filter?.compId !== undefined &&
      filter?.compId !== null &&
      String(filter.compId).trim() !== '' &&
      String(filter.compId).toLowerCase() !== 'all' &&
      String(filter.compId).toLowerCase() !== 'null' &&
      String(filter.compId).toLowerCase() !== 'undefined'
        ? String(filter.compId).trim()
        : null;

    if (compId && (compId.startsWith('oth-') || compId === '[OTHER]' || compId === 'other')) {
      const targetNationId = compId.startsWith('oth-') ? compId.slice(4) : nationId;
      if (targetNationId && String(targetNationId).toLowerCase() !== 'all') {
        qb.where('club.nation_id = :nationId', { nationId: targetNationId });
      }
      qb.andWhere('club.comp_id IS NULL')
        .andWhere('(club.is_extinct = false OR club.is_extinct IS NULL)');
    } else if (compId && (compId.startsWith('ext-') || compId === '[EXTINCT]' || compId === 'extinct')) {
      const targetNationId = compId.startsWith('ext-') ? compId.slice(4) : nationId;
      if (targetNationId && String(targetNationId).toLowerCase() !== 'all') {
        qb.where('club.nation_id = :nationId', { nationId: targetNationId });
      }
      qb.andWhere('club.is_extinct = true');
    } else {
      if (compId) {
        qb.andWhere('club.comp_id = :compId', { compId });
      }
      if (nationId) {
        qb.andWhere('club.nation_id = :nationId', { nationId });
      }
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(club.name_lg) LIKE :term OR LOWER(COALESCE(club.name_sh, \'\')) LIKE :term OR LOWER(COALESCE(club.name_3l, \'\')) LIKE :term OR CAST(club.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('club.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapClub), filter);
  }

  async getStadiums(nationIdOrFilter?: any, legacyFilter?: PaginationQueryDto) {
    let nationId: string | null = null;
    let filter: any = {};
    if (typeof nationIdOrFilter === 'object' && nationIdOrFilter !== null) {
      filter = { ...nationIdOrFilter };
      nationId = filter.nationId || null;
    } else {
      nationId = nationIdOrFilter;
      filter = legacyFilter || {};
    }

    const qb = this.stadiumRepo
      .createQueryBuilder('stadium')
      .leftJoinAndSelect('stadium.nation', 'nation');

    if (nationId && String(nationId).toLowerCase() !== 'all') {
      qb.where('stadium.nation_id = :nationId', { nationId: String(nationId) });
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(stadium.name) LIKE :term OR CAST(stadium.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('stadium.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapStadium), filter);
  }

  async getCities(nationIdOrFilter?: any, legacyFilter?: CityFilterDto) {
    let nationId: string | null = null;
    let filter: any = {};
    if (typeof nationIdOrFilter === 'object' && nationIdOrFilter !== null) {
      filter = { ...nationIdOrFilter };
      nationId = filter.nationId || null;
    } else {
      nationId = nationIdOrFilter;
      filter = legacyFilter || {};
    }

    const qb = this.cityRepo
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.nation', 'nation')
      .leftJoinAndSelect('city.regionEntity', 'regionEntity');

    if (nationId && String(nationId).toLowerCase() !== 'all') {
      qb.where('city.nation_id = :nationId', { nationId: String(nationId) });
    }

    if (filter?.regionId !== undefined && filter?.regionId !== null && String(filter.regionId) !== 'all') {
      if (String(filter.regionId) === '__uncategorized__' || Number(filter.regionId) === 0) {
        qb.andWhere('(city.region_id IS NULL OR city.region IS NULL OR TRIM(city.region) = \'\')');
      } else {
        qb.andWhere('city.region_id = :regId', { regId: Number(filter.regionId) });
      }
    } else if (filter?.category && filter.category !== 'all') {
      if (filter.category === '__uncategorized__') {
        qb.andWhere('(city.region IS NULL OR TRIM(city.region) = \'\')');
      } else {
        qb.andWhere('city.region = :cat', { cat: filter.category });
      }
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(city.name) LIKE :term OR LOWER(COALESCE(city.region, \'\')) LIKE :term OR CAST(city.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('city.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapCity), filter);
  }

  async getRegionsByNation(nationIdOrFilter?: any, legacyFilter?: PaginationQueryDto) {
    let nationId: string | null = null;
    let filter: any = {};
    if (typeof nationIdOrFilter === 'object' && nationIdOrFilter !== null) {
      filter = { ...nationIdOrFilter };
      nationId = filter.nationId || null;
    } else {
      nationId = nationIdOrFilter;
      filter = legacyFilter || {};
    }

    const qb = this.regionRepo.createQueryBuilder('region');
    if (nationId && String(nationId).toLowerCase() !== 'all') {
      qb.where('region.nation_id = :nationId', { nationId: String(nationId) });
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(region.name) LIKE :term OR LOWER(COALESCE(region.code, \'\')) LIKE :term)',
        { term },
      );
    }

    const regions = await qb.orderBy('region.name', 'ASC').getMany();

    // Query city counts per region
    let cityCountsQuery = this.cityRepo
      .createQueryBuilder('city')
      .select('city.region_id', 'region_id')
      .addSelect('COUNT(*)', 'count');

    if (nationId && String(nationId).toLowerCase() !== 'all') {
      cityCountsQuery = cityCountsQuery.where('city.nation_id = :nationId', { nationId: String(nationId) });
    }
    const cityCounts = await cityCountsQuery.groupBy('city.region_id').getRawMany();

    const countMap = new Map<number, number>();
    for (const c of cityCounts) {
      if (c.region_id) {
        countMap.set(Number(c.region_id), parseInt(c.count, 10));
      }
    }

    return regions.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code || null,
      nation_id: r.nation_id,
      citiesCount: countMap.get(r.id) || 0,
    }));
  }

  async getAwardsByNation(nationIdOrFilter?: any, legacyFilter?: PaginationQueryDto) {
    let nationId: string | null = null;
    let filter: any = {};
    if (typeof nationIdOrFilter === 'object' && nationIdOrFilter !== null) {
      filter = { ...nationIdOrFilter };
      nationId = filter.nationId || null;
    } else {
      nationId = nationIdOrFilter;
      filter = legacyFilter || {};
    }

    const qb = this.awardRepo
      .createQueryBuilder('award')
      .leftJoinAndSelect('award.nation', 'nation')
      .leftJoinAndSelect('award.competition', 'competition')
      .where('award.comp_id IS NULL');

    if (nationId && String(nationId).toLowerCase() !== 'all') {
      qb.andWhere('award.nation_id = :nationId', { nationId: String(nationId) });
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(award.name_lg) LIKE :term OR LOWER(COALESCE(award.name_sh, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapAward), filter);
  }

  async getAwardsByCompetition(compIdOrFilter?: any, legacyFilter?: PaginationQueryDto) {
    let compId: string | null = null;
    let filter: any = {};
    if (typeof compIdOrFilter === 'object' && compIdOrFilter !== null) {
      filter = { ...compIdOrFilter };
      compId = filter.compId || null;
    } else {
      compId = compIdOrFilter;
      filter = legacyFilter || {};
    }

    const strCompId = String(compId || '');
    if (
      strCompId.startsWith('oth-') ||
      strCompId.startsWith('ext-') ||
      strCompId === '[OTHER]' ||
      strCompId === '[EXTINCT]'
    ) {
      return paginateAndSort([], filter);
    }

    const qb = this.awardRepo
      .createQueryBuilder('award')
      .leftJoinAndSelect('award.nation', 'nation')
      .leftJoinAndSelect('award.competition', 'competition');

    if (compId && String(compId).toLowerCase() !== 'all') {
      qb.where('award.comp_id = :compId', { compId: String(compId) });
    }

    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      const term = `%${searchKey.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(award.name_lg) LIKE :term OR LOWER(COALESCE(award.name_sh, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapAward), filter);
  }

  async getCompetitionInfo(compId: string) {
    const strId = String(compId);
    if (
      strId.startsWith('oth-') ||
      strId === '[OTHER]' ||
      strId === 'other' ||
      strId.startsWith('ext-') ||
      strId === '[EXTINCT]' ||
      strId === 'extinct'
    ) {
      const isExtinct = strId.startsWith('ext-') || strId === '[EXTINCT]' || strId === 'extinct';
      const nationId = strId.startsWith('oth-')
        ? strId.slice(4)
        : strId.startsWith('ext-')
          ? strId.slice(4)
          : null;
      const nation = nationId
        ? await this.nationRepo.findOne({
            where: { id: nationId },
            relations: ['confederation'],
          })
        : null;

      let count = 0;
      if (nationId) {
        const countsRaw = await this.clubRepo.query(
          `SELECT
            COUNT(*) FILTER (WHERE comp_id IS NULL AND (is_extinct = false OR is_extinct IS NULL))::int as other_count,
            COUNT(*) FILTER (WHERE is_extinct = true)::int as extinct_count
          FROM clubs
          WHERE nation_id = $1;`,
          [nationId],
        );
        count = isExtinct ? (countsRaw[0]?.extinct_count || 0) : (countsRaw[0]?.other_count || 0);
      }

      const fakeId = isExtinct
        ? (nationId ? `ext-${nationId}` : '[EXTINCT]')
        : (nationId ? `oth-${nationId}` : '[OTHER]');
      const shortName = isExtinct ? 'Extinct Clubs' : 'Other Clubs';
      const longName = isExtinct ? '[EXTINCT] Extinct Clubs' : '[OTHER] Other Clubs';
      const threeLetter = isExtinct ? 'EXT' : 'OTH';

      return {
        id: fakeId,
        long_name: longName,
        short_name: shortName,
        three_letter_name: threeLetter,
        name_lg: longName,
        name_sh: shortName,
        name_3l: threeLetter,
        type: 'Other',
        categories: 'Other',
        nation_id: nationId,
        nation: mapNationRef(nation),
        nation_name: nation?.name_lg || nation?.name_sh,
        nation_three_letter: nation?.name_3l,
        confed_id: nation?.confed_id,
        confederation: nation?.confederation
          ? { id: String(nation.confederation.id), name: nation.confederation.name }
          : null,
        parent_id: null,
        parent: null,
        is_virtual: true,
        virtual_type: isExtinct ? 'EXTINCT' : 'OTHER',
        clubsCount: count,
        awardsCount: 0,
        childrenCount: 0,
        stats: {
          children: count,
        },
      };
    }

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
    return mapCompetition(
      {
        ...comp,
        clubsCount,
        awardsCount,
        childrenCount,
      },
      {
        children: clubsCount + awardsCount,
      },
    );
  }

  async getSubCompetitions(compId: string, filter?: PaginationQueryDto) {
    const strId = String(compId);
    let whereClause = 'c.parent_id = $1';
    const params: any[] = [strId];
    const searchKey = (filter?.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(c.name_lg) LIKE $${params.length} OR LOWER(COALESCE(c.name_sh, '')) LIKE $${params.length} OR LOWER(COALESCE(c.name_3l, '')) LIKE $${params.length} OR LOWER(COALESCE(c.type, '')) LIKE $${params.length} OR CAST(c.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.compRepo.query(
      `SELECT c.*,
        conf.name as confed_name,
        n.name_3l as nation_three_letter,
        n.name_lg as nation_long_name,
        n.name_sh as nation_short_name,
        p.name_lg as parent_long_name,
        p.name_sh as parent_short_name,
        p.name_3l as parent_three_letter,
        (SELECT COUNT(*) FROM competitions sub WHERE sub.parent_id = c.id)::int as children_count,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.comp_id = c.id)::int as clubs_count,
        (SELECT COUNT(*) FROM awards a WHERE a.comp_id = c.id)::int as awards_count
      FROM competitions c
      LEFT JOIN confederations conf ON conf.id = c.confed_id
      LEFT JOIN nations n ON n.id = c.nation_id
      LEFT JOIN competitions p ON p.id = c.parent_id
      WHERE ${whereClause}
      ORDER BY c.type ASC NULLS LAST, c.name_lg ASC;`,
      params,
    );

    const items = raw.map((r: any) =>
      mapCompetition(r, {
        children: (r.clubs_count || 0) + (r.awards_count || 0),
      }),
    );

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
        '(LOWER(award.name_lg) LIKE :term OR LOWER(COALESCE(award.name_sh, \'\')) LIKE :term OR CAST(award.id AS TEXT) LIKE :term)',
        { term },
      );
    }

    const items = await qb.orderBy('award.id', 'ASC').getMany();
    return paginateAndSort(items.map(mapAward), filter);
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
    if (
      filter.confedId !== undefined &&
      filter.confedId !== null &&
      String(filter.confedId).trim() !== '' &&
      String(filter.confedId).toLowerCase() !== 'all' &&
      String(filter.confedId).toLowerCase() !== 'null' &&
      String(filter.confedId).toLowerCase() !== 'undefined'
    ) {
      params.push(String(filter.confedId));
      whereClause += ` AND n.confed_id = $${params.length}`;
    }
    const searchKey = (filter.keyword || '').trim();
    if (searchKey) {
      params.push(`%${searchKey.toLowerCase()}%`);
      whereClause += ` AND (LOWER(n.name_lg) LIKE $${params.length} OR LOWER(COALESCE(n.name_sh, '')) LIKE $${params.length} OR LOWER(COALESCE(n.name_3l, '')) LIKE $${params.length} OR CAST(n.id AS TEXT) LIKE $${params.length})`;
    }

    const raw = await this.nationRepo.query(
      `SELECT n.id, n.name_lg, n.name_sh, n.name_3l, n.confed_id, conf.name as confederation_name,
        (SELECT COUNT(*) FROM competitions c WHERE c.nation_id = n.id AND (c.parent_id IS NULL OR c.parent_id = ''))::int as total_comps,
        (SELECT COUNT(*) FROM clubs cl WHERE cl.nation_id = n.id)::int as total_clubs,
        (SELECT COUNT(*) FROM stadiums s WHERE s.nation_id = n.id)::int as total_stadiums,
        (SELECT COUNT(*) FROM cities ci WHERE ci.nation_id = n.id)::int as total_cities,
        (SELECT COUNT(*) FROM awards a WHERE a.nation_id = n.id AND a.comp_id IS NULL)::int as total_awards
      FROM nations n
      LEFT JOIN confederations conf ON n.confed_id = conf.id
      WHERE ${whereClause}
      ORDER BY n.name_lg ASC;`,
      params,
    );

    const items = raw.map((r: any) =>
      mapNation(
        {
          ...r,
          confed_name: r.confederation_name,
        },
        {
          comps: r.total_comps || 0,
          clubs: r.total_clubs || 0,
          stadiums: r.total_stadiums || 0,
          cities: r.total_cities || 0,
          awards: r.total_awards || 0,
          children:
            (r.total_comps || 0) +
            (r.total_clubs || 0) +
            (r.total_stadiums || 0) +
            (r.total_cities || 0) +
            (r.total_awards || 0),
        },
      ),
    );

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
        this.nationRepo.count({ where: { confed_id: strId } }),
        this.compRepo
          .createQueryBuilder('comp')
          .where('comp.confed_id = :cid', { cid: strId })
          .andWhere('comp.nation_id IS NULL')
          .andWhere('(comp.parent_id IS NULL OR comp.parent_id = \'\')')
          .getCount(),
        this.compRepo
          .createQueryBuilder('comp')
          .leftJoin('comp.nation', 'nation')
          .where('comp.confed_id = :cid OR nation.confed_id = :cid', { cid: strId })
          .getCount(),
        this.clubRepo
          .createQueryBuilder('club')
          .innerJoin('club.nation', 'nation')
          .where('nation.confed_id = :cid', { cid: strId })
          .getCount(),
        this.stadiumRepo
          .createQueryBuilder('stadium')
          .innerJoin('stadium.nation', 'nation')
          .where('nation.confed_id = :cid', { cid: strId })
          .getCount(),
        this.cityRepo
          .createQueryBuilder('city')
          .innerJoin('city.nation', 'nation')
          .where('nation.confed_id = :cid', { cid: strId })
          .getCount(),
        this.awardRepo
          .createQueryBuilder('award')
          .innerJoin('award.nation', 'nation')
          .where('nation.confed_id = :cid', { cid: strId })
          .getCount(),
      ]);

    return {
      ...confed,
      stats: {
        nations: totalNations,
        intComps: totalIntComps,
        comps: totalComps,
        clubs: totalClubs,
        stadiums: totalStadiums,
        cities: totalCities,
        awards: totalAwards,
      },
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
      this.cityRepo.count({ where: { nation_id: strId } }),
      this.awardRepo.count({ where: { nation_id: strId, comp_id: IsNull() } }),
      this.awardRepo.count({ where: { nation_id: strId } }),
    ]);

    return mapNation(nation, {
      domesticComps: domesticComps + 2, // +2 cho [OTHER] và [EXTINCT]
      parentComps: domesticComps,
      comps: totalComps,
      independentClubs,
      extinctClubs,
      clubs: allClubs,
      stadiums,
      cities,
      awards,
      totalAwards,
    });
  }

  async getClubInfo(clubId: string) {
    const strId = String(clubId);
    const club = await this.clubRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'competition', 'competition.parent', 'parent'],
    });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const affiliates = await this.clubRepo.find({
      where: { parent_id: strId },
      relations: ['competition', 'nation'],
      order: { id: 'ASC' },
    });

    const mapped = mapClub(club);
    return {
      ...mapped,
      affiliates: affiliates.map(mapClub),
      affiliatesCount: affiliates.length,
    };
  }

  async getClubAffiliates(clubId: string) {
    const strId = String(clubId);
    const affiliates = await this.clubRepo.find({
      where: { parent_id: strId },
      relations: ['nation', 'competition', 'parent'],
      order: { id: 'ASC' },
    });
    return affiliates.map(mapClub);
  }

  async getCityInfo(cityId: string) {
    const strId = String(cityId);
    const city = await this.cityRepo.findOne({
      where: { id: strId },
      relations: ['nation', 'regionEntity'],
    });
    if (!city) {
      throw new NotFoundException(`City with ID ${cityId} not found`);
    }

    return mapCity(city);
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

    return mapAward(award);
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

    return mapStadium(stadium);
  }

  async getRegionInfo(id: number | string) {
    const region = await this.regionRepo.findOne({
      where: { id: Number(id) },
      relations: ['nation'],
    });
    if (!region) {
      throw new NotFoundException(`Region with ID ${id} not found`);
    }

    const citiesCount = await this.cityRepo.count({
      where: { region_id: Number(id) },
    });

    return {
      id: region.id,
      name: region.name,
      code: region.code || null,
      nation_id: region.nation_id,
      nation: region.nation
        ? {
            id: region.nation.id,
            long_name: region.nation.name_lg,
            short_name: region.nation.name_sh,
            three_letter_name: region.nation.name_3l,
          }
        : null,
      citiesCount,
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
      case 'region':
      case 'regions':
        return this.getRegionInfo(id);
      default:
        throw new BadRequestException(`Info not supported for entity type: ${type}`);
    }
  }
}

