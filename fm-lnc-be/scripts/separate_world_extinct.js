/**
 * separate_world_extinct.js
 * 
 * Separate confederation data into World and EXTINCT:
 * - Insert or update confederation 8 as 'EXTINCT'
 * - Ensure confederation 7 is 'World'
 * - Move all extinct nations (currently confed_id = '7') to confed_id = '8'
 * - Keep all International Comps (nation_id IS NULL) in confed_id = '7' (World)
 */
const { Client } = require('pg');
require('dotenv').config();

async function runMigration(client, label) {
  console.log(`\n=== Running separate_world_extinct on ${label} ===`);

  // 1. Ensure confederation 7 is 'World' and confederation 8 is 'EXTINCT'
  await client.query(`
    INSERT INTO confederations (id, name) VALUES ('7', 'World')
    ON CONFLICT (id) DO UPDATE SET name = 'World';
  `);
  await client.query(`
    INSERT INTO confederations (id, name) VALUES ('8', 'EXTINCT')
    ON CONFLICT (id) DO UPDATE SET name = 'EXTINCT';
  `);
  console.log('Confederation 7 set to World, 8 set to EXTINCT.');

  // 2. Move nations with confed_id = '7' to confed_id = '8'
  const moveRes = await client.query(`
    UPDATE nations SET confed_id = '8' WHERE confed_id = '7';
  `);
  console.log(`Moved ${moveRes.rowCount} nations from confed_id = '7' to confed_id = '8'.`);

  // 3. Verify
  const confeds = await client.query(`SELECT * FROM confederations ORDER BY id ASC;`);
  console.table(confeds.rows);

  const stats = await client.query(`
    SELECT c.id, c.name,
      (SELECT COUNT(*) FROM nations n WHERE n.confed_id = c.id) as total_nations,
      (SELECT COUNT(*) FROM competitions comp WHERE comp.confed_id = c.id AND comp.nation_id IS NULL) as total_int_comps
    FROM confederations c
    ORDER BY c.id ASC;
  `);
  console.table(stats.rows);
}

async function main() {
  // 1. Local PostgreSQL
  const localClient = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'fm_lnc_db',
  });

  try {
    await localClient.connect();
    await runMigration(localClient, 'Local PostgreSQL');
    await localClient.end();
  } catch (err) {
    console.error('Local DB error:', err.message);
  }

  // 2. Render PostgreSQL
  const RENDER_URL = process.env.DATABASE_URL || 'postgresql://fm_user:OS8WEWD7UsPMWgYmsKURYFMpSSlbkY9z@dpg-dbcmf50m7kps73c7kcsg-a.singapore-postgres.render.com/fm_lnc_db';
  const renderClient = new Client({
    connectionString: RENDER_URL + '?sslmode=require',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await renderClient.connect();
    await runMigration(renderClient, 'Render PostgreSQL');
    await renderClient.end();
  } catch (err) {
    console.error('Render DB error:', err.message);
  }
}

main().catch(console.error);
