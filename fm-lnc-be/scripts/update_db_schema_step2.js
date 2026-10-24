const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'fm_lnc_db',
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  // 1. Rename nations.confederation_id -> confed_id
  const checkConfedId = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'nations' AND column_name = 'confederation_id'`
  );
  if (checkConfedId.rows.length > 0) {
    console.log('Renaming nations.confederation_id -> confed_id...');
    await client.query(`ALTER TABLE nations RENAME COLUMN confederation_id TO confed_id;`);
    console.log('Renamed nations.confederation_id -> confed_id.');
  } else {
    console.log('nations.confederation_id already renamed or does not exist.');
  }

  // 2. Rename cities.country_id -> nation_id
  const checkCountryId = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'cities' AND column_name = 'country_id'`
  );
  if (checkCountryId.rows.length > 0) {
    console.log('Renaming cities.country_id -> nation_id...');
    await client.query(`ALTER TABLE cities RENAME COLUMN country_id TO nation_id;`);
    console.log('Renamed cities.country_id -> nation_id.');
  } else {
    console.log('cities.country_id already renamed or does not exist.');
  }

  // 3. Drop stadiums.note
  const checkStadiumNote = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' AND column_name = 'note'`
  );
  if (checkStadiumNote.rows.length > 0) {
    console.log('Dropping stadiums.note column...');
    await client.query(`ALTER TABLE stadiums DROP COLUMN note;`);
    console.log('Dropped stadiums.note column.');
  } else {
    console.log('stadiums.note does not exist.');
  }

  // 4. Update confederation names: AFC, UEFA, CAF, CONMEBOL, CONCACAF, OFC, World
  const confedUpdates = [
    { id: '1', name: 'CAF' },
    { id: '2', name: 'AFC' },
    { id: '3', name: 'UEFA' },
    { id: '4', name: 'CONCACAF' },
    { id: '5', name: 'OFC' },
    { id: '6', name: 'CONMEBOL' },
    { id: '7', name: 'World' },
  ];

  for (const c of confedUpdates) {
    console.log(`Updating confederation ${c.id} name to ${c.name}...`);
    await client.query(`UPDATE confederations SET name = $1 WHERE id = $2`, [c.name, c.id]);
  }

  console.log('Checking confederations in DB:');
  const resConfed = await client.query('SELECT * FROM confederations ORDER BY id ASC;');
  console.table(resConfed.rows);

  await client.end();
  console.log('Database updates completed successfully.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
