import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  Nation,
  City,
  Competition,
  Club,
  Stadium,
  Award,
  Person,
  Stage,
  Confederation,
} from '../entities';

@Injectable()
export class LncService {
  private readonly logger = new Logger(LncService.name);

  constructor(
    @InjectRepository(Confederation) private confedRepo: Repository<Confederation>,
    @InjectRepository(Nation) private nationRepo: Repository<Nation>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Competition) private compRepo: Repository<Competition>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Stadium) private stadiumRepo: Repository<Stadium>,
    @InjectRepository(Award) private awardRepo: Repository<Award>,
    @InjectRepository(Person) private personRepo: Repository<Person>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
  ) {}

  /**
   * Export complete merged .LNC format according to specification in fm_lnc_manager.md
   */
  async exportLnc(): Promise<string> {
    let out = '';
    const hr = '#====================================================================================\n';

    // 1. NATIONS
    const nations = await this.nationRepo.find({
      relations: ['confederation'],
      order: { id: 'ASC' },
    });
    let lastConf = '';
    for (const nat of nations) {
      const confName = nat.confederation?.name || 'WORLD';
      if (confName !== lastConf) {
        out += `\n# NATION > ${confName}\n${hr}`;
        lastConf = confName;
      }
      out += `"NATION_LONG_NAME_CHANGE"\t${nat.id}\t\t"${nat.name_lg}"\t\t\t\t8\n`;
      out += `"NATION_SHORT_NAME_CHANGE"\t${nat.id}\t\t"${nat.name_sh}"\t\t\t\t8\n`;
      out += `"NATION_3LETTER_NAME_CHANGE"\t${nat.id}\t\t"${nat.name_3l}"\t\t\t8\n\n`;
    }

    // 2. CITIES
    const cities = await this.cityRepo.find({
      relations: ['nation'],
      order: { id: 'ASC' },
    });
    for (const c of cities) {
      const code = c.nation?.name_3l || 'UNK';
      const nat = c.nation?.name_sh || 'Unknown';
      const cat = c.region ? ` > ${c.region}` : '';
      out += `# CITY > [${code}] ${nat}${cat}\n${hr}`;
      out += `"CITY_NAME_CHANGE"\t\t${c.id}\t\t"${c.name}"\t\t\t\t""\n\n`;
    }

    // 3. COMPETITIONS
    const comps = await this.compRepo.find({
      relations: ['nation', 'confederation'],
      order: { id: 'ASC' },
    });
    for (const comp of comps) {
      const conf = comp.confederation?.name || 'INTERNATIONAL';
      const isInter = comp.is_international || !comp.nation_id;
      const natCode = comp.nation?.name_3l || (isInter ? 'INT' : 'NAT');
      const natName = comp.nation?.name_sh || (isInter ? 'International' : 'National');
      const cat = comp.categories || (isInter ? 'International Competitions' : 'League/Cup');

      out += `# COMP > ${conf} > [${natCode}] ${natName} > ${cat}\n${hr}`;
      const inactList = (comp.inactive_fields || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const isInactive = (f: string) => inactList.includes(f);

      if (comp.parent_id) {
        const pfxParent = isInactive('parent_id') ? '#' : '';
        out += `${pfxParent}"COMP_PARENT_ID"\t\t${comp.id}\t\t ${comp.parent_id}\t\t\t\t\t\t""\n`;
      }

      if (comp.fg_color && comp.bg_color) {
        const pfx = isInactive('colors') ? '#' : '';
        out += `${pfx}"COMP_COLOUR_CHANGE"\t\t${comp.id}\t\t0 ${comp.fg_color} ${comp.bg_color}\t\t""\n`;
      }
      const pfxLong = isInactive('long_name') || isInactive('name_lg') ? '#' : '';
      const pfxShort = isInactive('short_name') || isInactive('name_sh') ? '#' : '';
      const pfx3 = isInactive('three_letter_name') || isInactive('name_3l') ? '#' : '';
      out += `${pfxLong}"COMP_LONG_NAME_CHANGE"\t${comp.id}\t\t"${comp.name_lg}"\t\t\t\t\t""\n`;
      out += `${pfxShort}"COMP_SHORT_NAME_CHANGE"\t${comp.id}\t\t"${comp.name_sh}"\t\t\t\t\t""\n`;
      if (comp.name_3l) {
        out += `${pfx3}"COMP_3LETTER_NAME_CHANGE"\t${comp.id}\t\t"${comp.name_3l}"\t\t\t\t""\n\n`;
      } else {
        out += '\n';
      }
    }

    // 4. CLUBS
    const clubs = await this.clubRepo.find({
      relations: ['nation', 'competition', 'nation.confederation'],
      order: {
        nation: { id: 'ASC' },
        comp_id: 'ASC',
        id: 'ASC',
      },
    });

    const CONFED_CODE_MAP: Record<string, string> = {
      Africa: 'CAF',
      Asia: 'AFC',
      Europe: 'UEFA',
      'North America': 'CONCACAF',
      Oceania: 'OFC',
      'South America': 'CONMEBOL',
      World: 'FIFA',
      International: 'FIFA',
    };

    let lastClubSectionKey = '';

    for (const cl of clubs) {
      const confName = cl.nation?.confederation?.name || 'World';
      const conf = CONFED_CODE_MAP[confName] || confName.toUpperCase();
      const code = cl.nation?.name_3l || 'NAT';
      const nat = (cl.nation?.name_lg || cl.nation?.name_sh || 'Nation').toUpperCase();

      let compPart = '';
      if (cl.competition) {
        const compId = cl.competition.id;
        const compName = cl.competition.name_sh || cl.competition.name_lg;
        const extra = cl.competition.note?.trim() ? ` ${cl.competition.note.trim()}` : '';
        compPart = `[${compId}] ${compName}${extra}`;
      } else {
        const isExtinct =
          cl.is_extinct ||
          cl.note?.toLowerCase().includes('extinct') ||
          cl.name_lg?.toLowerCase().includes('extinct');
        compPart = isExtinct ? '[EXTINCT]' : '[OTHER]';
      }

      const sectionKey = `${cl.nation?.id || 0}_${cl.comp_id || compPart}`;
      if (sectionKey !== lastClubSectionKey) {
        out += `\n# CLUB > ${conf} > [${code}] ${nat} > ${compPart}\n${hr}`;
        lastClubSectionKey = sectionKey;
      }

      const noteStr = cl.note ? `\t# ${cl.note}` : '';
      const inactiveList = (cl.inactive_fields || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const isInactive = (f: string) => inactiveList.includes(f);

      const pfxLong = isInactive('long_name') || isInactive('name_lg') ? '#' : '';
      const pfxShort = isInactive('short_name') || isInactive('name_sh') ? '#' : '';
      const pfx6 = isInactive('six_letter_name') || isInactive('name_6l') ? '#' : '';
      const pfx3 = isInactive('three_letter_name') || isInactive('name_3l') ? '#' : '';

      out += `${pfxLong}"CLUB_NAME_CHANGE"\t\t${cl.id}\t"${cl.name_lg}"\t\t\t\t\t\t""${noteStr}\n`;
      out += `${pfxShort}"CLUB_SHORT_NAME_CHANGE"\t${cl.id}\t"${cl.name_sh}"\t\t\t\t\t\t""${noteStr}\n`;
      if (cl.name_6l) {
        out += `${pfx6}"CLUB_6LETTER_NAME_CHANGE"\t${cl.id}\t"${cl.name_6l}"\t\t\t\t\t\t""${noteStr}\n`;
      }
      if (cl.name_3l) {
        out += `${pfx3}"CLUB_3LETTER_NAME_CHANGE"\t${cl.id}\t"${cl.name_3l}"\t\t\t\t\t\t""${noteStr}\n`;
      }
      out += '\n';
    }

    // 5. STADIUMS
    const stadiums = await this.stadiumRepo.find({
      relations: ['nation'],
      order: { id: 'ASC' },
    });
    for (const s of stadiums) {
      const code = s.nation?.name_3l || 'UNK';
      const nat = s.nation?.name_sh || 'Standard';
      const pfx = (s.inactive_fields || '').includes('name') ? '#' : '';
      out += `# STADIUM > [${code}] ${nat} > Standard\n${hr}`;
      out += `${pfx}"STADIUM_NAME_CHANGE"\t\t${s.id}\t\t"${s.name}"\t\t\t\t""\n\n`;
    }

    // 6. AWARDS
    const awards = await this.awardRepo.find({
      relations: ['nation', 'competition'],
      order: { id: 'ASC' },
    });
    for (const a of awards) {
      const code = a.nation?.name_3l || 'INT';
      const nat = a.nation?.name_sh || 'International';
      const sub = a.competition?.name_sh ? ` > ${a.competition.name_sh}` : '';
      out += `# AWARDS > [${code}] ${nat}${sub}\n${hr}`;
      const inactList = (a.inactive_fields || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const isInactive = (f: string) => inactList.includes(f);
      const pfxLong = isInactive('long_name') || isInactive('name_lg') ? '#' : '';
      const pfxShort = isInactive('short_name') || isInactive('name_sh') ? '#' : '';
      out += `${pfxLong}"AWARD_LONG_NAME_CHANGE"\t${a.id}\t"${a.name_lg}"\t\t\t\t\t\t""\n`;
      out += `${pfxShort}"AWARD_SHORT_NAME_CHANGE"\t${a.id}\t"${a.name_sh}"\t\t\t\t\t\t""\n\n`;
    }

    // 7. PEOPLE
    const people = await this.personRepo.find({ order: { id: 'ASC' } });
    if (people.length > 0) {
      out += `# PEOPLE\n${hr}`;
      for (const p of people) {
        out += `"CHANGE_PLAYER_NAME"\t${p.id}\t"${p.first_name}"\t\t"${p.common_name}"\t\t\t"${p.second_name}"\n`;
      }
      out += '\n';
    }

    // 8. STAGES
    const stages = await this.stageRepo.find({ order: { id: 'ASC' } });
    if (stages.length > 0) {
      out += `# STAGES\n${hr}`;
      for (const st of stages) {
        out += `"STAGE_NAME_LONG_NAME_CHANGE"\t\t${st.id}\t\t"${st.name}"\t\t\t\t8\n`;
      }
      out += '\n';
    }

    return out;
  }

  /**
   * Re-import all 3 .LNC files from disk into the database
   */
  async importLncFiles(baseDir?: string): Promise<{ success: boolean; stats: any }> {
    const dir = baseDir || process.env.LNC_FILES_DIR || path.resolve(__dirname, '../../..');
    this.logger.log(`Importing .lnc files from directory: ${dir}`);

    const fileCityNation = path.join(dir, 'FM24 - City & Nation.lnc');
    const fileClubStadium = path.join(dir, 'FM24 - Club & Stadium.lnc');
    const fileCompOther = path.join(dir, 'FM24 - Competition & Other.lnc');

    if (!fs.existsSync(fileCityNation) || !fs.existsSync(fileClubStadium) || !fs.existsSync(fileCompOther)) {
      throw new Error(
        `One or more .lnc files missing in directory ${dir}. Looked for:\n` +
        `- ${fileCityNation}\n- ${fileClubStadium}\n- ${fileCompOther}`
      );
    }

    const confedMap: Record<string, string> = {
      CAF: '1', AFRICA: '1',
      AFC: '2', ASIA: '2',
      UEFA: '3', EUROPE: '3',
      CONCACAF: '4', 'NORTH AMERICA': '4',
      OFC: '5', OCEANIA: '5',
      CONMEBOL: '6', 'SOUTH AMERICA': '6',
      WORLD: '7', INTERNATIONAL: '7', FIFA: '7',
      OTHER: '7',
    };

    // Ensure confederations
    const confeds = [
      { id: '1', name: 'CAF' },
      { id: '2', name: 'AFC' },
      { id: '3', name: 'UEFA' },
      { id: '4', name: 'CONCACAF' },
      { id: '5', name: 'OFC' },
      { id: '6', name: 'CONMEBOL' },
      { id: '7', name: 'World' },
    ];
    for (const c of confeds) {
      await this.confedRepo.save(c);
    }

    // 1. FM24 - City & Nation.lnc
    const contentCityNat = fs.readFileSync(fileCityNation, 'utf-8');
    const linesCityNat = contentCityNat.split(/\r?\n/);
    let curConfedId = '7';
    let curNationCode: string | null = null;
    let curCityCat: string | null = null;

    const nationsMap: Map<string, Partial<Nation>> = new Map();
    const citiesList: Partial<City>[] = [];

    for (const rawLine of linesCityNat) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('#')) {
        const h = line.replace(/^#+/, '').trim();
        if (h.startsWith('NATION >')) {
          const parts = h.split('>').map((p) => p.trim());
          const cName = parts[1]?.toUpperCase() || 'OTHER';
          curConfedId = confedMap[cName] || '7';
        } else if (h.startsWith('CITY >')) {
          const parts = h.split('>').map((p) => p.trim());
          if (parts.length > 1) {
            const m = parts[1].match(/\[([A-Z0-9]+)\]/);
            curNationCode = m ? m[1].trim() : null;
          }
          curCityCat = parts.length > 2 ? parts[2].trim() : null;
        }
        continue;
      }

      const match = line.match(/^"([^"]+)"\s+(\d+)\s+"([^"]*)"/);
      if (match) {
        const cmd = match[1];
        const id = match[2];
        const val = match[3].trim();

        if (cmd === 'NATION_LONG_NAME_CHANGE') {
          const nat = nationsMap.get(id) || { id, confed_id: curConfedId };
          nat.name_lg = val;
          nationsMap.set(id, nat);
        } else if (cmd === 'NATION_SHORT_NAME_CHANGE') {
          const nat = nationsMap.get(id) || { id, confed_id: curConfedId };
          nat.name_sh = val;
          nationsMap.set(id, nat);
        } else if (cmd === 'NATION_3LETTER_NAME_CHANGE') {
          const nat = nationsMap.get(id) || { id, confed_id: curConfedId };
          nat.name_3l = val;
          nationsMap.set(id, nat);
        } else if (cmd === 'CITY_NAME_CHANGE') {
          citiesList.push({
            id,
            name: val,
            region: curCityCat || undefined,
            // Nation resolved later
            nation_id: curNationCode as any,
          });
        }
      }
    }

    const codeToNationId: Record<string, string> = {};
    const nameToNationId: Record<string, string> = {};

    const nationsArray: Nation[] = Array.from(nationsMap.values()).map((n) => {
      const longName = n.name_lg || `Nation ${n.id}`;
      const shortName = n.name_sh || longName;
      const code = n.name_3l || 'UNK';
      const idStr = String(n.id);
      codeToNationId[code] = idStr;
      nameToNationId[longName.toUpperCase()] = idStr;
      nameToNationId[shortName.toUpperCase()] = idStr;
      return {
        id: idStr,
        name_lg: longName,
        name_sh: shortName,
        name_3l: code,
        confed_id: n.confed_id ? String(n.confed_id) : '7',
      } as Nation;
    });

    // Chunked saves
    const chunkSize = 1000;
    for (let i = 0; i < nationsArray.length; i += chunkSize) {
      await this.nationRepo.save(nationsArray.slice(i, i + chunkSize));
    }

    const citiesArray: City[] = citiesList.map((c) => ({
      id: String(c.id),
      name: c.name,
      region: c.region,
      nation_id: (c.nation_id && codeToNationId[c.nation_id as any]) || undefined,
    } as City));

    for (let i = 0; i < citiesArray.length; i += chunkSize) {
      await this.cityRepo.save(citiesArray.slice(i, i + chunkSize));
    }

    this.logger.log(`Imported ${nationsArray.length} nations and ${citiesArray.length} cities`);

    return {
      success: true,
      stats: {
        nations: nationsArray.length,
        cities: citiesArray.length,
      },
    };
  }
}
