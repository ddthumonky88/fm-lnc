/**
 * update_db_schema_step3.js
 * 
 * 1. competitions: categories + is_international => type
 *    - Rename categories -> type
 *    - Drop is_international
 * 2. cities: inactive_fields => is_disabled (boolean)
 *    - Add is_disabled BOOLEAN DEFAULT FALSE
 *    - Migrate: inactive_fields IS NOT NULL AND inactive_fields != '' -> is_disabled = TRUE
 *    - Drop inactive_fields
 * 3. stadiums: inactive_fields => is_disabled (boolean)
 *    - Add is_disabled BOOLEAN DEFAULT FALSE
 *    - Migrate: inactive_fields IS NOT NULL AND inactive_fields != '' -> is_disabled = TRUE
 *    - Drop inactive_fields
 */
const { Client } = require('pg');
require('dotenv').config();

async function migrate(client, dbName) {
  console.log(`\n=== Running Migration Step 3 on ${dbName} ===`);

  // 1. Competitions
  const checkCompCat = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'categories'`
  );
  const checkCompType = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'type'`
  );

  if (checkCompCat.rows.length > 0 && checkCompType.rows.length === 0) {
    console.log('Renaming competitions.categories -> type...');
    await client.query(`ALTER TABLE competitions RENAME COLUMN categories TO type;`);
    console.log('Renamed competitions.categories -> type.');
  } else if (checkCompType.rows.length > 0) {
    console.log('competitions.type already exists.');
  }

  const checkCompInter = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'is_international'`
  );
  if (checkCompInter.rows.length > 0) {
    console.log('Dropping competitions.is_international...');
    await client.query(`ALTER TABLE competitions DROP COLUMN is_international;`);
    console.log('Dropped competitions.is_international.');
  }

  // 2. Cities
  const checkCityDisabled = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'cities' AND column_name = 'is_disabled'`
  );
  if (checkCityDisabled.rows.length === 0) {
    console.log('Adding cities.is_disabled (BOOLEAN DEFAULT FALSE)...');
    await client.query(`ALTER TABLE cities ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;`);
  }

  const checkCityInactive = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'cities' AND column_name = 'inactive_fields'`
  );
  if (checkCityInactive.rows.length > 0) {
    console.log('Migrating cities inactive_fields -> is_disabled...');
    await client.query(`
      UPDATE cities 
      SET is_disabled = TRUE 
      WHERE inactive_fields IS NOT NULL AND TRIM(inactive_fields) != '';
    `);
    console.log('Dropping cities.inactive_fields...');
    await client.query(`ALTER TABLE cities DROP COLUMN inactive_fields;`);
    console.log('Dropped cities.inactive_fields.');
  }

  // 3. Stadiums
  const checkStadiumDisabled = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' AND column_name = 'is_disabled'`
  );
  if (checkStadiumDisabled.rows.length === 0) {
    console.log('Adding stadiums.is_disabled (BOOLEAN DEFAULT FALSE)...');
    await client.query(`ALTER TABLE stadiums ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;`);
  }

  const checkStadiumInactive = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' AND column_name = 'inactive_fields'`
  );
  if (checkStadiumInactive.rows.length > 0) {
    console.log('Migrating stadiums inactive_fields -> is_disabled...');
    await client.query(`
      UPDATE stadiums 
      SET is_disabled = TRUE 
      WHERE inactive_fields IS NOT NULL AND TRIM(inactive_fields) != '';
    `);
    console.log('Dropping stadiums.inactive_fields...');
    await client.query(`ALTER TABLE stadiums DROP COLUMN inactive_fields;`);
    console.log('Dropped stadiums.inactive_fields.');
  }

  // Verification
  console.log('Verification:');
  const compCols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'competitions' ORDER BY ordinal_position`
  );
  console.log('Competitions columns:', compCols.rows.map(r => r.column_name).join(', '));

  const cityCols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'cities' ORDER BY ordinal_position`
  );
  console.log('Cities columns:', cityCols.rows.map(r => r.column_name).join(', '));

  const stadiumCols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' ORDER BY ordinal_position`
  );
  console.log('Stadiums columns:', stadiumCols.rows.map(r => r.column_name).join(', '));
}

async function main() {
  // 1. Run on Local DB
  const localClient = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'fm_lnc_db',
  });

  try {
    await localClient.connect();
    await migrate(localClient, 'Local PostgreSQL');
    await localClient.end();
  } catch (err) {
    console.error('Local DB migration error:', err.message);
  }

  // 2. Run on Render DB
  const RENDER_URL = process.env.DATABASE_URL || 'postgresql://fm_user:OS8WEWD7UsPMWgYmsKURYFMpSSlbkY9z@dpg-dbcmf50m7kps73c7kcsg-a.singapore-postgres.render.com/fm_lnc_db';
  const renderClient = new Client({
    connectionString: RENDER_URL + '?sslmode=require',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await renderClient.connect();
    await migrate(renderClient, 'Render PostgreSQL');
    await renderClient.end();
  } catch (err) {
    console.error('Render DB migration error:', err.message);
  }
}

main().catch(console.error);
