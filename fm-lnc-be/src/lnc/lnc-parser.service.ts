import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LncParserService {
  private readonly logger = new Logger(LncParserService.name);
  private customBaseDir: string | null = null;

  constructor(private dataSource: DataSource) {}

  setBaseDir(dir: string) {
    this.customBaseDir = dir;
    this.logger.log(`Configured LNC base directory: ${dir}`);
  }

  getBaseDir(): string {
    if (this.customBaseDir && fs.existsSync(this.customBaseDir)) {
      return this.customBaseDir;
    }
    const candidates = [
      this.customBaseDir,
      process.env.LNC_FILES_DIR,
      path.resolve(process.cwd(), 'data'),
      path.resolve(__dirname, '../../data'),
      path.resolve(__dirname, '../../../data'),
      path.resolve(process.cwd(), '..'),
      path.resolve(__dirname, '../../../..'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(path.resolve(candidate, 'FM24 - City & Nation.lnc'))) {
        return candidate;
      }
      if (fs.existsSync(path.resolve(candidate, '..', 'FM24 - City & Nation.lnc'))) {
        return path.resolve(candidate, '..');
      }
    }
    return this.customBaseDir || path.resolve(process.cwd(), 'data');
  }

  checkLncFiles(dirToCheck?: string) {
    const dir = dirToCheck || this.getBaseDir();
    const exists = fs.existsSync(dir);
    const fileCityNat = path.resolve(dir, 'FM24 - City & Nation.lnc');
    const fileClubStadium = path.resolve(dir, 'FM24 - Club & Stadium.lnc');
    const fileCompOther = path.resolve(dir, 'FM24 - Competition & Other.lnc');

    const getFileInfo = (fPath: string, name: string) => {
      const fileExists = fs.existsSync(fPath);
      let size = 0;
      let mtime: string | undefined;
      if (fileExists) {
        try {
          const stat = fs.statSync(fPath);
          size = stat.size;
          mtime = stat.mtime.toISOString();
        } catch {}
      }
      return { name, exists: fileExists, size, mtime };
    };

    const files = {
      cityNation: getFileInfo(fileCityNat, 'FM24 - City & Nation.lnc'),
      clubStadium: getFileInfo(fileClubStadium, 'FM24 - Club & Stadium.lnc'),
      compOther: getFileInfo(fileCompOther, 'FM24 - Competition & Other.lnc'),
    };

    const allFilesFound = files.cityNation.exists && files.clubStadium.exists && files.compOther.exists;

    return {
      dir,
      exists,
      files,
      allFilesFound,
    };
  }

  async parseAndSeed(baseDir?: string) {
    const dir = baseDir || this.getBaseDir();

    this.logger.log(`Starting parse & seed from: ${dir}`);

    const fileCityNat = path.resolve(dir, 'FM24 - City & Nation.lnc');
    const fileClubStadium = path.resolve(dir, 'FM24 - Club & Stadium.lnc');
    const fileCompOther = path.resolve(dir, 'FM24 - Competition & Other.lnc');

    if (!fs.existsSync(fileCityNat) || !fs.existsSync(fileClubStadium) || !fs.existsSync(fileCompOther)) {
      throw new Error(`One or more .lnc files missing in directory "${dir}".`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`ALTER TABLE competitions ADD COLUMN IF NOT EXISTS parent_id BIGINT`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_competitions_parent_id ON competitions(parent_id)`);

      const confedMap: Record<string, string> = {
        CAF: 'CAF', AFRICA: 'CAF',
        AFC: 'AFC', ASIA: 'AFC',
        UEFA: 'UEFA', EUROPE: 'UEFA',
        CONCACAF: 'CONCACAF', 'NORTH AMERICA': 'CONCACAF',
        OFC: 'OFC', OCEANIA: 'OFC',
        CONMEBOL: 'CONMEBOL', 'SOUTH AMERICA': 'CONMEBOL',
        WORLD: 'WORLD', INTERNATIONAL: 'WORLD', FIFA: 'WORLD',
        EXTINCT: 'EXTINCT', OTHER: 'EXTINCT',
      };

      // 2. Parse City & Nation
      const cityNatLines = fs.readFileSync(fileCityNat, 'utf-8').split(/\r?\n/);
      const nations: Record<number, any> = {};
      const cities: Record<number, any> = {};
      let curConfed = 'WORLD';
      let curNatCode: string | null = null;
      let curNatName: string | null = null;
      let curCityCat: string | null = null;

      for (const l of cityNatLines) {
        let line = l.trim();
        if (!line) continue;
        if (line.startsWith('#')) {
          const h = line.replace(/^#+/, '').trim();
          if (h.startsWith('NATION >')) {
            const parts = h.split('>').map((p) => p.trim());
            const cName = parts[1]?.toUpperCase() || 'WORLD';
            curConfed = confedMap[cName] || 'WORLD';
            continue;
          } else if (h.startsWith('CITY >')) {
            const parts = h.split('>').map((p) => p.trim());
            if (parts.length > 1) {
              const m = parts[1].match(/\[([A-Z0-9]+)\]\s*(.*)/);
              if (m) {
                curNatCode = m[1].trim();
                curNatName = m[2].trim();
              } else {
                curNatCode = null;
                curNatName = parts[1].trim();
              }
            }
            curCityCat = parts.length > 2 ? parts[2].trim() : null;
            continue;
          } else if (h.startsWith('=')) {
            continue;
          }
        }

        const isCommented = line.startsWith('#');
        const cleanLine = isCommented ? line.replace(/^#+\s*/, '').trim() : line;

        const m = cleanLine.match(/^"([^"]+)"\s+(\d+)\s+"([^"]*)"/);
        if (m) {
          const cmd = m[1];
          const id = parseInt(m[2], 10);
          const val = m[3].trim();
          if (cmd === 'NATION_LONG_NAME_CHANGE' || cmd === 'NATION_SHORT_NAME_CHANGE' || cmd === 'NATION_3LETTER_NAME_CHANGE') {
            if (!nations[id]) nations[id] = { confed: curConfed, inactive_fields: new Set() };
            if (!nations[id].inactive_fields) nations[id].inactive_fields = new Set();
            if (cmd === 'NATION_LONG_NAME_CHANGE') {
              nations[id].name_lg = val;
              if (isCommented) nations[id].inactive_fields.add('name_lg');
              else nations[id].inactive_fields.delete('name_lg');
            } else if (cmd === 'NATION_SHORT_NAME_CHANGE') {
              nations[id].name_sh = val;
              if (isCommented) nations[id].inactive_fields.add('name_sh');
              else nations[id].inactive_fields.delete('name_sh');
            } else if (cmd === 'NATION_3LETTER_NAME_CHANGE') {
              nations[id].name_3l = val;
              if (isCommented) nations[id].inactive_fields.add('name_3l');
              else nations[id].inactive_fields.delete('name_3l');
            }
          } else if (cmd === 'CITY_NAME_CHANGE') {
            if (!cities[id]) {
              cities[id] = {
                name: val,
                natCode: curNatCode,
                natName: curNatName,
                cat: curCityCat,
                inactive_fields: new Set(),
              };
            }
            cities[id].name = val;
            cities[id].is_disabled = isCommented;
          }
        }
      }

      const codeToNationId: Record<string, number> = {};
      const nameToNationId: Record<string, number> = {};

      for (const [idStr, ndata] of Object.entries(nations)) {
        const id = parseInt(idStr, 10);
        const lName = ndata.name_lg || `Nation ${id}`;
        const sName = ndata.name_sh || lName;
        const code = ndata.name_3l || 'UNK';
        const cid = ndata.confed || 'WORLD';

        codeToNationId[code] = id;
        nameToNationId[lName.toUpperCase()] = id;
        nameToNationId[sName.toUpperCase()] = id;

        const inactStr = ndata.inactive_fields && ndata.inactive_fields.size > 0
          ? Array.from(ndata.inactive_fields).sort().join(',')
          : null;

        await queryRunner.query(
          `INSERT INTO nations (id, name_lg, name_sh, name_3l, confed, inactive_fields)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name_lg = EXCLUDED.name_lg,
             name_sh = EXCLUDED.name_sh,
             name_3l = EXCLUDED.name_3l,
             confed = EXCLUDED.confed,
             inactive_fields = EXCLUDED.inactive_fields`,
          [id, lName, sName, code, cid, inactStr],
        );
      }

      // 2.1 Upsert regions & link cities
      const regionMap = new Map<string, { natId: number; regCode: string | null; regName: string }>();
      for (const [idStr, cdata] of Object.entries(cities)) {
        let natId = null;
        if (cdata.natCode && codeToNationId[cdata.natCode]) {
          natId = codeToNationId[cdata.natCode];
        } else if (cdata.natName && nameToNationId[cdata.natName.toUpperCase()]) {
          natId = nameToNationId[cdata.natName.toUpperCase()];
        }
        if (natId && cdata.cat) {
          const rm = cdata.cat.match(/^\[([^\]]+)\]\s*(.*)$/);
          const regCode = rm ? rm[1].trim() : null;
          const regName = rm ? rm[2].trim() : cdata.cat.trim();
          if (regName) {
            const key = `${natId}:::${regName.toLowerCase()}`;
            if (!regionMap.has(key)) {
              regionMap.set(key, { natId, regCode, regName });
            } else if (regCode && !regionMap.get(key)!.regCode) {
              regionMap.get(key)!.regCode = regCode;
            }
          }
        }
      }

      for (const r of regionMap.values()) {
        await queryRunner.query(
          `INSERT INTO regions (name, code, nation_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (nation_id, name)
           DO UPDATE SET code = COALESCE(EXCLUDED.code, regions.code)`,
          [r.regName, r.regCode, String(r.natId)],
        );
      }

      const dbRegs = await queryRunner.query('SELECT id, name, nation_id FROM regions');
      const regDbMap = new Map<string, number>();
      for (const r of dbRegs) {
        regDbMap.set(`${r.nation_id}:::${r.name.toLowerCase()}`, r.id);
      }

      for (const [idStr, cdata] of Object.entries(cities)) {
        const id = parseInt(idStr, 10);
        let natId = null;
        if (cdata.natCode && codeToNationId[cdata.natCode]) {
          natId = codeToNationId[cdata.natCode];
        } else if (cdata.natName && nameToNationId[cdata.natName.toUpperCase()]) {
          natId = nameToNationId[cdata.natName.toUpperCase()];
        }

        let regName = cdata.cat ? cdata.cat.trim() : null;
        let regId = null;
        if (natId && cdata.cat) {
          const rm = cdata.cat.match(/^\[([^\]]+)\]\s*(.*)$/);
          regName = rm ? rm[2].trim() : cdata.cat.trim();
          regId = regDbMap.get(`${natId}:::${regName.toLowerCase()}`) || null;
        }

        await queryRunner.query(
          `INSERT INTO cities (id, name, nation_id, region, region_id, is_disabled)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             nation_id = EXCLUDED.nation_id,
             region = EXCLUDED.region,
             region_id = EXCLUDED.region_id,
             is_disabled = EXCLUDED.is_disabled`,
          [id, cdata.name, natId, regName, regId, !!cdata.is_disabled],
        );
      }

      // 3. Competitions & Other
      const compOtherLines = fs.readFileSync(fileCompOther, 'utf-8').split(/\r?\n/);
      const comps: Record<number, any> = {};
      const awards: Record<number, any> = {};
      let curCompConfed: string | null = null;
      let curCompNatCode: string | null = null;
      let curCompCat: string | null = null;

      for (const l of compOtherLines) {
        let line = l.trim();
        if (!line) continue;
        if (line.startsWith('#')) {
          const h = line.replace(/^#+/, '').trim();
          if (h.startsWith('COMP >')) {
            const parts = h.split('>').map((p) => p.trim());
            const cf = parts[1]?.toUpperCase() || 'WORLD';
            curCompConfed = confedMap[cf] || 'WORLD';
            curCompNatCode = null;
            if (parts.length > 2) {
              const m = parts[2].match(/\[([A-Z0-9]+)\]/);
              if (m) curCompNatCode = m[1].trim();
            }
            curCompCat = parts.length > 3 ? parts[3].trim() : null;
            continue;
          } else if (h.startsWith('AWARDS >')) {
            const parts = h.split('>').map((p) => p.trim());
            const cf = parts[1]?.toUpperCase() || 'WORLD';
            curCompConfed = confedMap[cf] || 'WORLD';
            curCompNatCode = null;
            if (parts.length >= 4) {
              const m = parts[2].match(/\[([A-Za-z0-9]{3})\]/);
              if (m) curCompNatCode = m[1].trim();
              curCompCat = parts[3].trim();
            } else if (parts.length === 3) {
              curCompNatCode = null;
              curCompCat = parts[2].trim();
            } else {
              curCompCat = null;
            }
            continue;
          } else if (h.startsWith('STAGE >') || h.startsWith('PERSON >') || h.startsWith('PLAYER >') || h.startsWith('=')) {
            continue;
          }
        }

        const isCommented = line.startsWith('#');
        const cleanLine = isCommented ? line.replace(/^#+\s*/, '').trim() : line;

        if (cleanLine.includes('CHANGE_PLAYER_NAME')) {
          const quotes = cleanLine.match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, ''));
          const idMatch = cleanLine.match(/"CHANGE_PLAYER_NAME"\s+(\d+)/);
          if (idMatch && quotes && quotes.length >= 4) {
            const pid = parseInt(idMatch[1], 10);
            await queryRunner.query(
              `INSERT INTO people (id, first_name, common_name, second_name)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO UPDATE SET
                 first_name = EXCLUDED.first_name,
                 common_name = EXCLUDED.common_name,
                 second_name = EXCLUDED.second_name`,
              [pid, quotes[1], quotes[2], quotes[3]],
            );
          }
          continue;
        }

        const parentMatch = cleanLine.match(/^"(?:PARENT_COMP_ID|COMP_PARENT_ID)"\s+(\d+)\s+(\d+)/);
        if (parentMatch) {
          const cid = parseInt(parentMatch[1], 10);
          const pid = parseInt(parentMatch[2], 10);
          if (!comps[cid]) {
            comps[cid] = { confed: curCompConfed, nat_code: curCompNatCode, cat: curCompCat, inactive_fields: new Set() };
          }
          if (!comps[cid].inactive_fields) comps[cid].inactive_fields = new Set();
          comps[cid].parent_id = pid;
          if (isCommented) comps[cid].inactive_fields.add('parent_id');
          else comps[cid].inactive_fields.delete('parent_id');
          continue;
        }

        const colMatch = cleanLine.match(/^"COMP_COLOUR_CHANGE"\s+(\d+)\s+([0-9\s]+)\s+""/);
        if (colMatch) {
          const cid = parseInt(colMatch[1], 10);
          const tokens = colMatch[2].trim().split(/\s+/);
          if (!comps[cid]) {
            comps[cid] = { confed: curCompConfed, nat_code: curCompNatCode, cat: curCompCat, inactive_fields: new Set() };
          }
          if (!comps[cid].inactive_fields) comps[cid].inactive_fields = new Set();
          if (tokens.length >= 7) {
            const offset = tokens.length >= 8 ? 2 : 1;
            comps[cid].fg_color = `${tokens[offset]} ${tokens[offset + 1]} ${tokens[offset + 2]}`;
            comps[cid].bg_color = `${tokens[offset + 3]} ${tokens[offset + 4]} ${tokens[offset + 5]}`;
          }
          if (isCommented) comps[cid].inactive_fields.add('colors');
          else comps[cid].inactive_fields.delete('colors');
          continue;
        }

        const m = cleanLine.match(/^"([^"]+)"\s+(\d+)\s+"([^"]*)"/);
        if (m) {
          const cmd = m[1];
          const id = parseInt(m[2], 10);
          const val = m[3].trim();
          if (cmd === 'COMP_LONG_NAME_CHANGE' || cmd === 'COMP_SHORT_NAME_CHANGE' || cmd === 'COMP_3LETTER_NAME_CHANGE') {
            if (!comps[id]) comps[id] = { confed: curCompConfed, nat_code: curCompNatCode, cat: curCompCat, inactive_fields: new Set() };
            if (!comps[id].inactive_fields) comps[id].inactive_fields = new Set();
            if (cmd === 'COMP_LONG_NAME_CHANGE') {
              comps[id].name_lg = val;
              if (isCommented) comps[id].inactive_fields.add('name_lg');
              else comps[id].inactive_fields.delete('name_lg');
            }
            if (cmd === 'COMP_SHORT_NAME_CHANGE') {
              comps[id].name_sh = val;
              if (isCommented) comps[id].inactive_fields.add('name_sh');
              else comps[id].inactive_fields.delete('name_sh');
            }
            if (cmd === 'COMP_3LETTER_NAME_CHANGE') {
              comps[id].name_3l = val;
              if (isCommented) comps[id].inactive_fields.add('name_3l');
              else comps[id].inactive_fields.delete('name_3l');
            }
          } else if (cmd === 'AWARD_LONG_NAME_CHANGE' || cmd === 'AWARD_SHORT_NAME_CHANGE') {
            if (!awards[id]) awards[id] = { confed: curCompConfed, nat_code: curCompNatCode, cat: curCompCat, inactive_fields: new Set() };
            if (!awards[id].inactive_fields) awards[id].inactive_fields = new Set();
            if (cmd === 'AWARD_LONG_NAME_CHANGE') {
              awards[id].name_lg = val;
              if (isCommented) awards[id].inactive_fields.add('name_lg');
              else awards[id].inactive_fields.delete('name_lg');
            }
            if (cmd === 'AWARD_SHORT_NAME_CHANGE') {
              awards[id].name_sh = val;
              if (isCommented) awards[id].inactive_fields.add('name_sh');
              else awards[id].inactive_fields.delete('name_sh');
            }
          } else if (cmd === 'STAGE_NAME_LONG_NAME_CHANGE') {
            await queryRunner.query(
              `INSERT INTO stages (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
              [id, val],
            );
          }
        }
      }

      const compNameToId: Record<string, number> = {};
      for (const [idStr, cdata] of Object.entries(comps)) {
        const id = parseInt(idStr, 10);
        const lName = cdata.name_lg || `Competition ${id}`;
        const sName = cdata.name_sh || lName;
        const code = cdata.name_3l || null;
        const fg = cdata.fg_color || null;
        const bg = cdata.bg_color || null;
        const natId = cdata.nat_code ? codeToNationId[cdata.nat_code] || null : null;
        const isInter = natId === null;
        const parentId = cdata.parent_id || null;

        compNameToId[lName.toLowerCase()] = id;
        compNameToId[sName.toLowerCase()] = id;

        const inactStr = cdata.inactive_fields && cdata.inactive_fields.size > 0
          ? Array.from(cdata.inactive_fields).sort().join(',')
          : null;

        await queryRunner.query(
          `INSERT INTO competitions (id, name_lg, name_sh, name_3l, fg_color, bg_color, confed, nation_id, type, inactive_fields, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name_lg = EXCLUDED.name_lg,
             name_sh = EXCLUDED.name_sh,
             name_3l = EXCLUDED.name_3l,
             fg_color = EXCLUDED.fg_color,
             bg_color = EXCLUDED.bg_color,
             confed = EXCLUDED.confed,
             nation_id = EXCLUDED.nation_id,
             type = EXCLUDED.type,
             inactive_fields = EXCLUDED.inactive_fields,
             parent_id = EXCLUDED.parent_id`,
          [id, lName, sName, code, fg, bg, cdata.confed, natId, cdata.cat, inactStr, parentId],
        );
      }

      for (const [idStr, adata] of Object.entries(awards)) {
        const id = parseInt(idStr, 10);
        const lName = adata.name_lg || `Award ${id}`;
        const sName = adata.name_sh || lName;
        const natId = adata.nat_code ? codeToNationId[adata.nat_code.toUpperCase()] || null : null;
        let compId = null;
        if (adata.cat) {
          const compMatch = adata.cat.match(/\[(\d+)\]/);
          if (compMatch) compId = parseInt(compMatch[1], 10);
          else compId = compNameToId[adata.cat.toLowerCase()] || null;
        }

        const inactStr = adata.inactive_fields && adata.inactive_fields.size > 0
          ? Array.from(adata.inactive_fields).sort().join(',')
          : null;

        await queryRunner.query(
          `INSERT INTO awards (id, name_lg, name_sh, nation_id, comp_id, inactive_fields)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name_lg = EXCLUDED.name_lg,
             name_sh = EXCLUDED.name_sh,
             nation_id = EXCLUDED.nation_id,
             comp_id = EXCLUDED.comp_id,
             inactive_fields = EXCLUDED.inactive_fields`,
          [id, lName, sName, natId, compId, inactStr],
        );
      }

      // 4. Club & Stadium
      const clubStadiumLines = fs.readFileSync(fileClubStadium, 'utf-8').split(/\r?\n/);
      const clubs: Record<number, any> = {};
      const stadiums: Record<number, any> = {};
      let curClubNatCode: string | null = null;
      let curClubCompCat: string | null = null;
      let curStadNatCode: string | null = null;
      let curStadCat: string | null = null;

      for (const l of clubStadiumLines) {
        let line = l.trim();
        if (!line) continue;
        if (line.startsWith('#')) {
          const h = line.replace(/^#+/, '').trim();
          if (h.startsWith('CLUB >')) {
            const parts = h.split('>').map((p) => p.trim());
            curClubNatCode = null;
            if (parts.length > 2) {
              const m = parts[2].match(/\[([A-Z0-9]+)\]/);
              if (m) curClubNatCode = m[1].trim();
            }
            curClubCompCat = parts.length > 3 ? parts[3].trim() : null;
            continue;
          } else if (h.startsWith('STADIUM >')) {
            const parts = h.split('>').map((p) => p.trim());
            curStadNatCode = null;
            if (parts.length > 1) {
              const m = parts[1].match(/\[([A-Z0-9]+)\]/);
              if (m) curStadNatCode = m[1].trim();
            }
            curStadCat = parts.length > 2 ? parts[2].trim() : null;
            continue;
          } else if (h.startsWith('=')) {
            continue;
          }
        }

        // Check if commented command
        const isCommented = line.startsWith('#');
        const cleanLine = isCommented ? line.replace(/^#+\s*/, '').trim() : line;

        let note: string | null = null;
        let workingLine = cleanLine;
        if (workingLine.includes('#')) {
          const p = workingLine.split('#');
          note = p.slice(1).join('#').trim();
          workingLine = p[0].trim();
        }

        const m = workingLine.match(/^"([^"]+)"\s+(\d+)\s+"([^"]*)"/);
        if (m) {
          const cmd = m[1];
          const id = parseInt(m[2], 10);
          const val = m[3].trim();
          if (cmd === 'AFFILIATED_CLUB_ID' || cmd === 'CLUB_AFFILIATED_CLUB') {
            const affM = val.match(/^([A-Za-z0-9]+)-(\d+)/);
            if (affM) {
              if (!clubs[id]) {
                clubs[id] = { nat_code: curClubNatCode, comp_cat: curClubCompCat, note, inactive_fields: new Set() };
              }
              if (!clubs[id].inactive_fields) clubs[id].inactive_fields = new Set();
              clubs[id].affiliate_club_type = affM[1].trim();
              clubs[id].affiliate_club_id = parseInt(affM[2], 10);
            }
            continue;
          }
          if (cmd.startsWith('CLUB_')) {
            if (!clubs[id]) {
              clubs[id] = { nat_code: curClubNatCode, comp_cat: curClubCompCat, note, inactive_fields: new Set() };
            }
            if (!clubs[id].inactive_fields) clubs[id].inactive_fields = new Set();
            if (cmd === 'CLUB_NAME_CHANGE') {
              clubs[id].name_lg = val;
              if (isCommented) clubs[id].inactive_fields.add('name_lg');
              else clubs[id].inactive_fields.delete('name_lg');
            }
            if (cmd === 'CLUB_SHORT_NAME_CHANGE') {
              clubs[id].name_sh = val;
              if (isCommented) clubs[id].inactive_fields.add('name_sh');
              else clubs[id].inactive_fields.delete('name_sh');
            }
            if (cmd === 'CLUB_3LETTER_NAME_CHANGE') {
              clubs[id].name_3l = val;
              if (isCommented) clubs[id].inactive_fields.add('name_3l');
              else clubs[id].inactive_fields.delete('name_3l');
            }
            if (cmd === 'CLUB_6LETTER_NAME_CHANGE') {
              clubs[id].name_6l = val;
              if (isCommented) clubs[id].inactive_fields.add('name_6l');
              else clubs[id].inactive_fields.delete('name_6l');
            }
            if (note && !clubs[id].note) clubs[id].note = note;
          } else if (cmd === 'STADIUM_NAME_CHANGE') {
            const isTraining = Boolean(
              (curStadCat && curStadCat.toLowerCase().includes('training')) ||
              val.toLowerCase().includes('training') ||
              val.toLowerCase().includes('pitch') ||
              val.toLowerCase().includes('football base')
            );
            const stadiumType = isTraining ? 'training pitch' : 'stadium';
            stadiums[id] = { name: val, nat_code: curStadNatCode, note, inactive: isCommented, type: stadiumType };
          }
        }
      }

      for (const [idStr, cdata] of Object.entries(clubs)) {
        const id = parseInt(idStr, 10);
        const lName = cdata.name_lg || `Club ${id}`;
        const sName = cdata.name_sh || lName;
        const natId = cdata.nat_code ? codeToNationId[cdata.nat_code] || null : null;
        let compId = null;
        if (cdata.comp_cat) {
          const mCompId = cdata.comp_cat.match(/\[(\d+)\]/);
          if (mCompId) {
            compId = parseInt(mCompId[1], 10);
          } else if (!cdata.comp_cat.includes('OTHER') && !cdata.comp_cat.includes('EXTINCT')) {
            const clean = cdata.comp_cat.replace(/\s*\(\d+\/\d+\)/, '').replace(/\s*\(\d+\)/, '').trim().toLowerCase();
            compId = compNameToId[clean] || compNameToId[cdata.comp_cat.toLowerCase()] || null;
          }
        }
        const inactStr = cdata.inactive_fields && cdata.inactive_fields.size > 0
          ? Array.from(cdata.inactive_fields).sort().join(',')
          : null;
        const isExtinct =
          Boolean(cdata.comp_cat && cdata.comp_cat.includes('EXTINCT')) ||
          Boolean(cdata.note?.toLowerCase().includes('extinct')) ||
          Boolean(lName?.toLowerCase().includes('extinct'));

        await queryRunner.query(
          `INSERT INTO clubs (id, name_lg, name_sh, name_6l, name_3l, nation_id, comp_id, note, inactive_fields, is_extinct, affiliate_club_id, affiliate_club_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             name_lg = EXCLUDED.name_lg,
             name_sh = EXCLUDED.name_sh,
             name_6l = EXCLUDED.name_6l,
             name_3l = EXCLUDED.name_3l,
             nation_id = EXCLUDED.nation_id,
             comp_id = EXCLUDED.comp_id,
             note = EXCLUDED.note,
             inactive_fields = EXCLUDED.inactive_fields,
             is_extinct = EXCLUDED.is_extinct,
             affiliate_club_id = EXCLUDED.affiliate_club_id,
             affiliate_club_type = EXCLUDED.affiliate_club_type`,
          [id, lName, sName, cdata.name_6l || null, cdata.name_3l || null, natId, compId, cdata.note || null, inactStr, isExtinct, cdata.affiliate_club_id ? String(cdata.affiliate_club_id) : (cdata.parent_id ? String(cdata.parent_id) : null), cdata.affiliate_club_type || cdata.affiliate_type || null],
        );
      }

      for (const [idStr, sdata] of Object.entries(stadiums)) {
        const id = parseInt(idStr, 10);
        const natId = sdata.nat_code ? codeToNationId[sdata.nat_code] || null : null;
        const inactStr = sdata.inactive ? 'name' : null;

        await queryRunner.query(
          `INSERT INTO stadiums (id, name, nation_id, is_disabled, type)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             nation_id = EXCLUDED.nation_id,
             is_disabled = EXCLUDED.is_disabled,
             type = EXCLUDED.type`,
          [id, sdata.name, natId, !!sdata.inactive, sdata.type || 'stadium'],
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log('Database import completed successfully!');
      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error during database import', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
