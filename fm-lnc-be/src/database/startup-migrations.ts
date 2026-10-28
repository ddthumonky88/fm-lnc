import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PARENT_MAPPINGS } from './parent-mappings';

export async function runStartupMigrations(dataSource: DataSource, logger: Logger): Promise<void> {
  logger.log('Checking database schema and running startup migrations...');

  try {
    // 1. Run DDL migration to guarantee parent_id and VARCHAR(64) columns
    await dataSource.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- 1. Ensure parent_id column exists on competitions
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

          -- Ensure code column exists on regions
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'code'
          ) THEN
              ALTER TABLE "regions" ADD COLUMN "code" VARCHAR(64);
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
          ALTER TABLE IF EXISTS "nations" ALTER COLUMN "confederation_id" TYPE VARCHAR(64) USING "confederation_id"::text;

          ALTER TABLE IF EXISTS "cities" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "cities" ALTER COLUMN "country_id" TYPE VARCHAR(64) USING "country_id"::text;

          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "confed_id" TYPE VARCHAR(64) USING "confed_id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "competitions" ALTER COLUMN "parent_id" TYPE VARCHAR(64) USING "parent_id"::text;

          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "clubs" ALTER COLUMN "comp_id" TYPE VARCHAR(64) USING "comp_id"::text;

          ALTER TABLE IF EXISTS "stadiums" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "stadiums" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;

          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;
          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "nation_id" TYPE VARCHAR(64) USING "nation_id"::text;
          ALTER TABLE IF EXISTS "awards" ALTER COLUMN "comp_id" TYPE VARCHAR(64) USING "comp_id"::text;

          ALTER TABLE IF EXISTS "people" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;

          ALTER TABLE IF EXISTS "stages" ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;

          -- 4. Re-create foreign keys
          BEGIN
              ALTER TABLE "nations" ADD CONSTRAINT "fk_nations_confed" FOREIGN KEY ("confederation_id") REFERENCES "confederations"("id") ON DELETE SET NULL;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
              ALTER TABLE "cities" ADD CONSTRAINT "fk_cities_nation" FOREIGN KEY ("country_id") REFERENCES "nations"("id") ON DELETE SET NULL;
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
          CREATE INDEX IF NOT EXISTS "idx_regions_code" ON "regions"("code");
      END $$;
    `);
    logger.log('Schema DDL verified: parent_id column and VARCHAR(64) types are up to date.');

    // 2. Check if parent_id data is populated
    const countRes = await dataSource.query(`
      SELECT COUNT(*)::int as cnt FROM competitions WHERE parent_id IS NOT NULL;
    `);
    const count = countRes[0]?.cnt || 0;
    if (count === 0 && PARENT_MAPPINGS.length > 0) {
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
      logger.log('Successfully populated parent_id mappings.');
    } else {
      logger.log(`Competitions already have parent_id populated (${count} records). Skipping data seed.`);
    }
  } catch (error) {
    logger.error('Startup migration encountered an error:', error);
  }
}
