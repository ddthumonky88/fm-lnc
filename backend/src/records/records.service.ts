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
} from '../entities';

export enum RecordType {
  COMPETITION = 'competition',
  CLUB = 'club',
  STADIUM = 'stadium',
  CITY = 'city',
  AWARD = 'award',
  PERSON = 'person',
  PLAYER = 'player',
  STAGE = 'stage',
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
  ) {}

  private getRepository(type: RecordType | string): Repository<any> {
    switch (type) {
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
      default:
        throw new BadRequestException(`Unknown record type: ${type}`);
    }
  }

  async getRecord(type: RecordType, id: string) {
    const repo = this.getRepository(type);
    const item = await repo.findOne({ where: { id: String(id) } });
    if (!item) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return item;
  }

  async createRecord(type: RecordType, data: any) {
    const repo = this.getRepository(type);
    if (!data.id) {
      throw new BadRequestException('FM ID is required');
    }
    data.id = String(data.id);
    if (data.nation_id !== undefined) data.nation_id = data.nation_id ? String(data.nation_id) : null;
    if (data.confed_id !== undefined) data.confed_id = data.confed_id ? String(data.confed_id) : null;
    if (data.confederation_id !== undefined) data.confederation_id = data.confederation_id ? String(data.confederation_id) : null;
    if (data.country_id !== undefined) data.country_id = data.country_id ? String(data.country_id) : null;
    if (data.comp_id !== undefined) data.comp_id = data.comp_id ? String(data.comp_id) : null;
    if (data.parent_id !== undefined) data.parent_id = data.parent_id ? String(data.parent_id) : null;

    const existing = await repo.findOne({ where: { id: data.id } });
    if (existing) {
      throw new BadRequestException(`${type} with ID ${data.id} already exists`);
    }
    return repo.save(data);
  }

  async updateRecord(type: RecordType, id: string, data: any) {
    const repo = this.getRepository(type);
    const strId = String(id);
    const existing = await repo.findOne({ where: { id: strId } });
    if (!existing) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    if (data.nation_id !== undefined) data.nation_id = data.nation_id ? String(data.nation_id) : null;
    if (data.confed_id !== undefined) data.confed_id = data.confed_id ? String(data.confed_id) : null;
    if (data.confederation_id !== undefined) data.confederation_id = data.confederation_id ? String(data.confederation_id) : null;
    if (data.country_id !== undefined) data.country_id = data.country_id ? String(data.country_id) : null;
    if (data.comp_id !== undefined) data.comp_id = data.comp_id ? String(data.comp_id) : null;
    if (data.parent_id !== undefined) data.parent_id = data.parent_id ? String(data.parent_id) : null;

    const updated = repo.merge(existing, data);
    return repo.save(updated);
  }

  async deleteRecord(type: RecordType, id: string) {
    const repo = this.getRepository(type);
    const result = await repo.delete(String(id));
    if (result.affected === 0) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return { success: true, message: `${type} with ID ${id} deleted successfully` };
  }
}
