import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Nation,
  City,
  Competition,
  Club,
  Stadium,
  Award,
  Person,
  Stage,
  Region,
} from '../entities';

function normalizeInputData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const d = { ...data };
  if (d.long_name !== undefined && d.name_lg === undefined) d.name_lg = d.long_name;
  if (d.name_lg !== undefined && d.long_name === undefined) d.long_name = d.name_lg;

  if (d.short_name !== undefined && d.name_sh === undefined) d.name_sh = d.short_name;
  if (d.name_sh !== undefined && d.short_name === undefined) d.short_name = d.name_sh;

  if (d.six_letter_name !== undefined && d.name_6l === undefined) d.name_6l = d.six_letter_name;
  if (d.name_6l !== undefined && d.six_letter_name === undefined) d.six_letter_name = d.name_6l;

  if (d.three_letter_name !== undefined && d.name_3l === undefined) d.name_3l = d.three_letter_name;
  if (d.name_3l !== undefined && d.three_letter_name === undefined) d.three_letter_name = d.name_3l;

  if (d.categories !== undefined && d.region === undefined) d.region = d.categories;
  if (d.region !== undefined && d.categories === undefined) d.categories = d.region;

  if (d.categories !== undefined && d.type === undefined) d.type = d.categories;
  if (d.type !== undefined && d.categories === undefined) d.categories = d.type;

  if (d.isDisabled !== undefined && d.is_disabled === undefined) d.is_disabled = !!d.isDisabled;
  if (d.is_disabled !== undefined) d.is_disabled = !!d.is_disabled;
  else if (d.inactive_fields !== undefined) d.is_disabled = Boolean(d.inactive_fields && String(d.inactive_fields).trim() !== '');

  if (d.confederation_id !== undefined && d.confed_id === undefined) d.confed_id = d.confederation_id;
  if (d.country_id !== undefined && d.nation_id === undefined) d.nation_id = d.country_id;

  if (d.nation && typeof d.nation === 'object' && d.nation.id) {
    d.nation_id = d.nation.id;
  }
  if (d.confed && typeof d.confed === 'object' && d.confed.id) {
    d.confed_id = d.confed.id;
  }
  if (d.comp && typeof d.comp === 'object' && d.comp.id) {
    d.comp_id = d.comp.id;
  }
  if (d.parent && typeof d.parent === 'object' && d.parent.id) {
    d.parent_id = d.parent.id;
  }
  if (d.parent_club && typeof d.parent_club === 'object' && d.parent_club.id) {
    d.parent_id = d.parent_club.id;
  }
  if (d.region_id !== undefined) {
    d.region_id = d.region_id && String(d.region_id) !== 'all' ? Number(d.region_id) : null;
  }
  if (d.affiliate_type !== undefined) {
    d.affiliate_type = d.affiliate_type ? String(d.affiliate_type).trim().toUpperCase() : null;
  }

  if (d.nation_id !== undefined) d.nation_id = d.nation_id ? String(d.nation_id) : null;
  if (d.confed_id !== undefined) d.confed_id = d.confed_id ? String(d.confed_id) : null;
  if (d.comp_id !== undefined) d.comp_id = d.comp_id ? String(d.comp_id) : null;
  if (d.parent_id !== undefined) d.parent_id = d.parent_id ? String(d.parent_id) : null;

  return d;
}

export enum RecordType {
  NATION = 'nation',
  COMPETITION = 'competition',
  CLUB = 'club',
  STADIUM = 'stadium',
  CITY = 'city',
  AWARD = 'award',
  PERSON = 'person',
  PLAYER = 'player',
  STAGE = 'stage',
  REGION = 'region',
}

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
    @InjectRepository(Region) private regionRepo: Repository<Region>,
  ) {}

  private getRepository(type: RecordType | string): Repository<any> {
    switch (type) {
      case RecordType.NATION:
      case 'nation':
        return this.nationRepo;
      case RecordType.COMPETITION:
      case 'competition':
        return this.compRepo;
      case RecordType.CLUB:
      case 'club':
        return this.clubRepo;
      case RecordType.STADIUM:
      case 'stadium':
        return this.stadiumRepo;
      case RecordType.CITY:
      case 'city':
        return this.cityRepo;
      case RecordType.AWARD:
      case 'award':
        return this.awardRepo;
      case RecordType.PERSON:
      case 'person':
      case RecordType.PLAYER:
      case 'player':
        return this.personRepo;
      case RecordType.STAGE:
      case 'stage':
        return this.stageRepo;
      case RecordType.REGION:
      case 'region':
      case 'regions':
        return this.regionRepo;
      default:
        throw new BadRequestException(`Unknown record type: ${type}`);
    }
  }

  async getRecord(type: RecordType, id: string) {
    const repo = this.getRepository(type);
    const isRegion = type === RecordType.REGION || (type as string) === 'region' || (type as string) === 'regions';
    const item = await repo.findOne({ where: (isRegion ? { id: Number(id) } : { id: String(id) }) as any });
    if (!item) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return item;
  }

  async createRecord(type: RecordType, data: any) {
    const repo = this.getRepository(type);
    data = normalizeInputData(data);
    const isRegion = type === RecordType.REGION || (type as string) === 'region' || (type as string) === 'regions';
    if (!data.id && !isRegion) {
      throw new BadRequestException('FM ID is required');
    }
    if (data.id) {
      data.id = isRegion ? Number(data.id) : String(data.id);
    }
    if (type === RecordType.STADIUM) {
      delete data.note;
      if (!data.type) data.type = 'stadium';
    }
    if (type === RecordType.CITY && data.region_id) {
      const reg = await this.regionRepo.findOne({ where: { id: data.region_id } });
      if (reg) {
        data.region = reg.name;
      }
    }

    const existing = data.id ? await repo.findOne({ where: { id: data.id } as any }) : null;
    if (existing) {
      throw new BadRequestException(`${type} with ID ${data.id} already exists`);
    }
    return repo.save(data);
  }

  async updateRecord(type: RecordType, id: string, data: any) {
    const repo = this.getRepository(type);
    data = normalizeInputData(data);
    const isRegion = type === RecordType.REGION || (type as string) === 'region' || (type as string) === 'regions';
    const strId = (isRegion ? Number(id) : String(id)) as any;
    const existing = await repo.findOne({ where: { id: strId } });
    if (!existing) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    if (type === RecordType.STADIUM) {
      delete data.note;
    }
    if (type === RecordType.CITY && data.region_id !== undefined) {
      if (data.region_id) {
        const reg = await this.regionRepo.findOne({ where: { id: data.region_id } });
        if (reg) {
          data.region = reg.name;
        }
      } else {
        data.region = null;
      }
    }

    const updated = repo.merge(existing, data);
    return repo.save(updated);
  }

  async deleteRecord(type: RecordType, id: string) {
    const repo = this.getRepository(type);
    const isRegion = type === RecordType.REGION || (type as string) === 'region' || (type as string) === 'regions';
    const result = await repo.delete((isRegion ? Number(id) : String(id)) as any);
    if (result.affected === 0) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return { success: true, message: `${type} with ID ${id} deleted successfully` };
  }
}
