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

  async getRecord(type: RecordType, id: number) {
    const repo = this.getRepository(type);
    const item = await repo.findOne({ where: { id } });
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
    const existing = await repo.findOne({ where: { id: data.id } });
    if (existing) {
      throw new BadRequestException(`${type} with ID ${data.id} already exists`);
    }
    return repo.save(data);
  }

  async updateRecord(type: RecordType, id: number, data: any) {
    const repo = this.getRepository(type);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    const updated = repo.merge(existing, data);
    return repo.save(updated);
  }

  async deleteRecord(type: RecordType, id: number) {
    const repo = this.getRepository(type);
    const result = await repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return { success: true, message: `${type} with ID ${id} deleted successfully` };
  }
}
