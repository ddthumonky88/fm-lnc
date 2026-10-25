/**
 * create_regions_table.js
 * Creates the `regions` table connecting `nations` and `cities`:
 * - 1 region belongs to 1 nation (nation_id)
 * - 1 city can belong to 1 region (cities.region_id)
 * - Populates regions from existing cities.region data
 * - Links cities to regions via cities.region_id
 */
const { Client } = require('pg');

const RENDER_URL =
  process.env.DATABASE_URL ||
  'postgresql://fm_user:OS8WEWD7UsPMWgYmsKURYFMpSSlbkY9z@dpg-dbcmf50m7kps73c7kcsg-a.singapore-postgres.render.com/fm_lnc_db';

async function main() {
  const isLocal = process.env.USE_LOCAL === '1' || process.argv.includes('--local');
  const client = isLocal
    ? new Client({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: '123456',
        database: 'fm_lnc_db',
      })
    : new Client({
        connectionString: RENDER_URL + '?sslmode=require',
        ssl: { rejectUnauthorized: false },
      });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  try {
    // 1. Create table regions
    console.log('Creating table regions if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_nation_region UNIQUE (nation_id, name)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regions_nation_id ON regions(nation_id);
    `);
    console.log('Table regions created or already exists.');

    // 2. Add region_id to cities table if not exists
    console.log('Adding region_id column to cities if not exists...');
    await client.query(`
      ALTER TABLE cities
      ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cities_region_id ON cities(region_id);
    `);
    console.log('Column cities.region_id added.');

    // 3. Populate regions from existing cities.region
    console.log('Populating regions from existing cities...');
    const insertRes = await client.query(`
      INSERT INTO regions (name, nation_id)
      SELECT DISTINCT TRIM(region) AS name, nation_id
      FROM cities
      WHERE region IS NOT NULL AND TRIM(region) != '' AND nation_id IS NOT NULL
      ON CONFLICT (nation_id, name) DO NOTHING;
    `);
    console.log(`Populated regions: ${insertRes.rowCount} rows inserted.`);

    // 4. Update cities.region_id
    console.log('Updating cities.region_id links...');
    const updateRes = await client.query(`
      UPDATE cities c
      SET region_id = r.id
      FROM regions r
      WHERE c.nation_id = r.nation_id AND TRIM(c.region) = r.name
      AND c.region_id IS NULL;
    `);
    console.log(`Updated cities.region_id: ${updateRes.rowCount} rows linked.`);

    // 5. Verification
    const countRegions = await client.query('SELECT count(*) FROM regions;');
    const countLinkedCities = await client.query('SELECT count(*) FROM cities WHERE region_id IS NOT NULL;');
    console.log(`Total regions in DB: ${countRegions.rows[0].count}`);
    console.log(`Total cities linked with region_id: ${countLinkedCities.rows[0].count}`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

main();
