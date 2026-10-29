import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PARENT_MAPPINGS } from './parent-mappings';

function findLncFile(fileName: string): string | null {
  const candidates = [
    process.env.LNC_FILES_DIR ? path.resolve(process.env.LNC_FILES_DIR, fileName) : null,
    path.resolve(process.cwd(), 'data', fileName),
    path.resolve(__dirname, '../../data', fileName),
    path.resolve(__dirname, '../../../data', fileName),
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), '..', fileName),
    path.resolve(__dirname, '../../../../data', fileName),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export async function runStartupMigrations(dataSource: DataSource, logger: Logger): Promise<void> {
  logger.log('Checking database schema and running startup migrations...');

  try {
    // 1. Run DDL migration to guarantee tables, columns, indexes, and VARCHAR(64)
    await dataSource.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- 1. Ensure table regions exists
          CREATE TABLE IF NOT EXISTS "regions" (
              "id" SERIAL PRIMARY KEY,
              "name" VARCHAR(255) NOT NULL,
              "code" VARCHAR(64),
              "nation_id" VARCHAR(64),
              "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "uq_nation_region" UNIQUE ("nation_id", "name")
          );

          -- Ensure code column exists on regions
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'code'
          ) THEN
              ALTER TABLE "regions" ADD COLUMN "code" VARCHAR(64);
          END IF;

          -- Ensure parent_id column exists on competitions
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'competitions' AND column_name = 'parent_id'
          ) THEN
              ALTER TABLE "competitions" ADD COLUMN "parent_id" VARCHAR(64);
          END IF;

          -- Ensure type column exists on stadiums
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'stadiums' AND column_name = 'type'
          ) THEN
              ALTER TABLE "stadiums" ADD COLUMN "type" VARCHAR(50) DEFAULT 'stadium';
          END IF;

          -- Ensure region_id column exists on cities
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'cities' AND column_name = 'region_id'
          ) THEN
              ALTER TABLE "cities" ADD COLUMN "region_id" INTEGER;
          END IF;

          -- Ensure affiliate_club_id & affiliate_club_type columns exist on clubs
          IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'parent_id'
          ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'affiliate_club_id'
          ) THEN
              ALTER TABLE "clubs" RENAME COLUMN "parent_id" TO "affiliate_club_id";
          ELSE
              ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "affiliate_club_id" VARCHAR(64);
          END IF;

          IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'affiliate_type'
          ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'affiliate_club_type'
          ) THEN
              ALTER TABLE "clubs" RENAME COLUMN "affiliate_type" TO "affiliate_club_type";
          ELSE
              ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "affiliate_club_type" VARCHAR(64);
          END IF;

          -- 2. Drop existing foreign key constraints so column types can be altered safely
          FOR r IN (
              SELECT tc.table_name, tc.constraint_name
              FROM information_schema.table_constraints AS tc
              WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
          ) LOOP
              EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '" CASCADE;';
          END LOOP;

          -- 3. Alter all id and foreign key columns to VARCHAR(64)
          ALTER TABLE IF EXISTS "confederations" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;

          ALTER TABLE IF EXISTS "nations" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "nations" ALTER COLUMN "confed_id" TYPE VARCHAR(64) USING "confed_id"::text;

          ALTER TABLE IF EXISTS "cities" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "cities" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;

          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "confed_id" TYPE VARCHAR(64) USING "confed_id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "parent_id" TYPE VARCHAR(64) USING "parent_id"::text;

          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "comp_id" TYPE VARCHAR(64) USING "comp_id"::text;
          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "affiliate_club_id" TYPE VARCHAR(64) USING "affiliate_club_id"::text;

          ALTER TABLE IF EXISTS "stadiums" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "stadiums" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;

          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "comp_id" TYPE VARCHAR(64) USING "comp_id"::text;

          ALTER TABLE IF EXISTS "people" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "stages" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;

          -- 4. Re-create foreign keys
          BEGIN
              ALTER TABLE "nations" ADD CONSTRAINT "fk_nations_confed" FOREIGN KEY ("confed_id") REFERENCES "confederations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "regions" ADD CONSTRAINT "fk_regions_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE CASCADE;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_region" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "competitions" ADD CONSTRAINT "fk_comps_confed" FOREIGN KEY ("confed_id") REFERENCES "confederations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "competitions" ADD CONSTRAINT "fk_comps_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "competitions" ADD CONSTRAINT "fk_comps_parent" FOREIGN KEY ("parent_id") REFERENCES "competitions"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "clubs" ADD CONSTRAINT "fk_clubs_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "clubs" ADD CONSTRAINT "fk_clubs_comp" FOREIGN KEY ("comp_id") REFERENCES "competitions"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "clubs" ADD CONSTRAINT "fk_clubs_affiliate" FOREIGN KEY ("affiliate_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "stadiums" ADD CONSTRAINT "fk_stadiums_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "awards" ADD CONSTRAINT "fk_awards_nation" FOREIGN KEY ("nation_id") REFERENCES "nations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "awards" ADD CONSTRAINT "fk_awards_comp" FOREIGN KEY ("comp_id") REFERENCES "competitions"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          -- 5. Indexes
          CREATE INDEX IF NOT EXISTS "idx_competitions_parent_id" ON "competitions"("parent_id");
          CREATE INDEX IF NOT EXISTS "idx_regions_nation_id" ON "regions"("nation_id");
          CREATE INDEX IF NOT EXISTS "idx_regions_code" ON "regions"("code");
          CREATE INDEX IF NOT EXISTS "idx_cities_region_id" ON "cities"("region_id");
          CREATE INDEX IF NOT EXISTS "idx_clubs_affiliate_club_id" ON "clubs"("affiliate_club_id");
      END $$;
    `);
    logger.log('Schema DDL verified: regions, parent_id, affiliate_club_id, and VARCHAR(64) types are up to date.');

    // 2. Check if parent_id data is populated for competitions
    const compCountRes = await dataSource.query(`
      SELECT COUNT(*)::int as cnt FROM competitions WHERE parent_id IS NOT NULL;
    `);
    const compCount = compCountRes[0]?.cnt || 0;
    if (compCount === 0 && PARENT_MAPPINGS.length > 0) {
      logger.log(`Populating parent_id for ${PARENT_MAPPINGS.length} competitions...`);
      const chunkSize = 200;
      for (let i = 0; i < PARENT_MAPPINGS.length; i += chunkSize) {
        const chunk = PARENT_MAPPINGS.slice(i, i + chunkSize);
        const valuesClause = chunk
          .map(([cid, pid]) => `('${cid.replace(/'/g, "''")}', '${pid.replace(/'/g, "''")}')`)
          .join(', ');

        await dataSource.query(`
          UPDATE competitions AS c
          SET 
            parent_id = v.pid,
            inactive_fields = CASE 
              WHEN c.inactive_fields IS NULL OR c.inactive_fields = '' THEN 'parent_id'
              WHEN c.inactive_fields ~* '(^|,)\\s*parent_id\\s*(,|$)' THEN c.inactive_fields
              ELSE c.inactive_fields || ',parent_id'
            END
          FROM (VALUES ${valuesClause}) AS v(cid, pid)
          WHERE c.id = v.cid;
        `);
      }
      logger.log('Successfully populated competition parent_id mappings.');
    }

    // 3. Check and populate affiliate clubs from FM24 - Club & Stadium.lnc
    const clubCountRes = await dataSource.query(`
      SELECT COUNT(*)::int as cnt FROM clubs WHERE affiliate_club_id IS NOT NULL;
    `);
    const clubCount = clubCountRes[0]?.cnt || 0;
    if (clubCount === 0) {
      const clubLncFile = findLncFile('FM24 - Club & Stadium.lnc');
      if (clubLncFile && fs.existsSync(clubLncFile)) {
        logger.log(`Populating affiliate clubs from ${clubLncFile}...`);
        const content = fs.readFileSync(clubLncFile, 'utf8');
        const lines = content.split(/\r?\n/);
        const regex = /^\s*(#?)\s*"(?:AFFILIATED_CLUB_ID|CLUB_AFFILIATED_CLUB)"\s+(\d+)\s+"([A-Za-z0-9]+)-(\d+)"/;

        const affiliateRows: { childId: string; parentId: string; type: string; isCommented: boolean }[] = [];
        for (const line of lines) {
          const m = line.match(regex);
          if (m) {
            affiliateRows.push({
              childId: m[2],
              type: m[3],
              parentId: m[4],
              isCommented: Boolean(m[1]),
            });
          }
        }

        if (affiliateRows.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < affiliateRows.length; i += chunkSize) {
            const chunk = affiliateRows.slice(i, i + chunkSize);
            const valuesClause = chunk
              .map(
                (r) =>
                  `('${r.childId.replace(/'/g, "''")}', '${r.parentId.replace(/'/g, "''")}', '${r.type.replace(/'/g, "''")}', ${r.isCommented})`,
              )
              .join(', ');

            await dataSource.query(`
              UPDATE clubs AS c
              SET 
                affiliate_club_id = v.pid,
                affiliate_club_type = v.type,
                inactive_fields = CASE
                  WHEN v.is_comm = true THEN
                    CASE 
                      WHEN c.inactive_fields IS NULL OR c.inactive_fields = '' THEN 'affiliate'
                      WHEN c.inactive_fields ~* '(^|,)\\s*affiliate\\s*(,|$)' THEN c.inactive_fields
                      ELSE c.inactive_fields || ',affiliate'
                    END
                  ELSE c.inactive_fields
                END
              FROM (VALUES ${valuesClause}) AS v(cid, pid, type, is_comm)
              WHERE c.id = v.cid;
            `);
          }
          logger.log(`Successfully populated ${affiliateRows.length} affiliate club records.`);
        }
      }
    }

    // 4. Check and sync regions / unlinked cities from FM24 - City & Nation.lnc
    const unlinkedCityRes = await dataSource.query(`
      SELECT COUNT(*)::int as cnt FROM cities WHERE region_id IS NULL AND region IS NOT NULL;
    `);
    const unlinkedCityCount = unlinkedCityRes[0]?.cnt || 0;
    if (unlinkedCityCount > 0) {
      const cityLncFile = findLncFile('FM24 - City & Nation.lnc');
      if (cityLncFile && fs.existsSync(cityLncFile)) {
        logger.log(`Syncing regions & linking ${unlinkedCityCount} cities from ${cityLncFile}...`);
        const nRes = await dataSource.query('SELECT id, name_3l, name_lg FROM nations');
        const natMap: Record<string, string> = {};
        for (const n of nRes) {
          if (n.name_3l) natMap[n.name_3l.toUpperCase().trim()] = String(n.id);
          if (n.name_lg) natMap[n.name_lg.toUpperCase().trim()] = String(n.id);
        }

        const lines = fs.readFileSync(cityLncFile, 'utf8').split(/\r?\n/);
        const headerRegex = /^#\s*CITY\s*>\s*\[([^\]]+)\]\s*([^>]+)>\s*(?:\[([^\]]+)\]\s*)?(.*)$/;
        let curNatId: string | null = null;
        let curRegCode: string | null = null;
        let curRegName: string | null = null;

        const regionMap = new Map<string, { natId: string; regCode: string | null; regName: string }>();
        const cityMappings: { cityId: string; natId: string; regName: string }[] = [];

        for (const l of lines) {
          const trimmed = l.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('#')) {
            const m = trimmed.match(headerRegex);
            if (m) {
              const natCode = m[1].trim().toUpperCase();
              curNatId = natMap[natCode] || null;
              curRegCode = m[3] ? m[3].trim() : null;
              curRegName = m[4] ? m[4].trim() : null;

              if (curNatId && curRegName) {
                const key = `${curNatId}:::${curRegName.toLowerCase()}`;
                if (!regionMap.has(key)) {
                  regionMap.set(key, { natId: curNatId, regCode: curRegCode, regName: curRegName });
                } else if (curRegCode && !regionMap.get(key)!.regCode) {
                  regionMap.get(key)!.regCode = curRegCode;
                }
              }
            }
            continue;
          }

          const cityMatch = trimmed.match(/^#?\s*"CITY_NAME_CHANGE"\s+(\d+)\s+"([^"]*)"/);
          if (cityMatch && curNatId && curRegName) {
            cityMappings.push({
              cityId: cityMatch[1],
              natId: curNatId,
              regName: curRegName,
            });
          }
        }

        // Upsert regions
        for (const r of regionMap.values()) {
          await dataSource.query(
            `INSERT INTO regions (name, code, nation_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (nation_id, name)
             DO UPDATE SET code = COALESCE(EXCLUDED.code, regions.code)`,
            [r.regName, r.regCode, r.natId],
          );
        }

        const dbRegs = await dataSource.query('SELECT id, name, nation_id FROM regions');
        const regDbMap = new Map<string, number>();
        for (const r of dbRegs) {
          regDbMap.set(`${r.nation_id}:::${r.name.toLowerCase()}`, r.id);
        }

        // Chunked city updates
        const chunkSize = 300;
        for (let i = 0; i < cityMappings.length; i += chunkSize) {
          const chunk = cityMappings.slice(i, i + chunkSize);
          const validChunk = chunk
            .map((c) => {
              const regId = regDbMap.get(`${c.natId}:::${c.regName.toLowerCase()}`);
              return regId ? { ...c, regId } : null;
            })
            .filter(Boolean) as { cityId: string; regId: number; regName: string }[];

          if (validChunk.length > 0) {
            const valuesClause = validChunk
              .map((c) => `('${c.cityId.replace(/'/g, "''")}', ${c.regId}, '${c.regName.replace(/'/g, "''")}')`)
              .join(', ');

            await dataSource.query(`
              UPDATE cities AS c
              SET region_id = v.reg_id, region = v.reg_name
              FROM (VALUES ${valuesClause}) AS v(cid, reg_id, reg_name)
              WHERE c.id = v.cid;
            `);
          }
        }
        logger.log(`Successfully synced regions and linked cities.`);
      }
    }
  } catch (error) {
    logger.error('Startup migration encountered an error:', error);
  }
}
