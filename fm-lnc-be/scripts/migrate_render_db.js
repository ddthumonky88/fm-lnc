/**
 * migrate_render_db.js
 * Run database migrations on Render PostgreSQL:
 * 1. Rename columns across all tables (nations, cities, competitions, clubs, awards)
 * 2. Rename foreign key columns (nations.confederation_id -> confed_id, cities.country_id -> nation_id)
 * 3. Drop stadiums.note
 * 4. Update confederations names (1: CAF, 2: AFC, 3: UEFA, 4: CONCACAF, 5: OFC, 6: CONMEBOL, 7: World)
 */
const { Client } = require('pg');

const RENDER_URL = process.env.DATABASE_URL || 'postgresql://fm_user:OS8WEWD7UsPMWgYmsKURYFMpSSlbkY9z@dpg-dbcmf50m7kps73c7kcsg-a.singapore-postgres.render.com/fm_lnc_db';

async function main() {
  const client = new Client({
    connectionString: RENDER_URL + '?sslmode=require',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Render PostgreSQL successfully.');

  const renames = [
    // nations
    { table: 'nations', from: 'long_name', to: 'name_lg' },
    { table: 'nations', from: 'short_name', to: 'name_sh' },
    { table: 'nations', from: 'three_letter_name', to: 'name_3l' },
    { table: 'nations', from: 'confederation_id', to: 'confed_id' },

    // cities
    { table: 'cities', from: 'country_id', to: 'nation_id' },
    { table: 'cities', from: 'categories', to: 'region' },

    // competitions
    { table: 'competitions', from: 'long_name', to: 'name_lg' },
    { table: 'competitions', from: 'short_name', to: 'name_sh' },
    { table: 'competitions', from: 'three_letter_name', to: 'name_3l' },

    // clubs
    { table: 'clubs', from: 'long_name', to: 'name_lg' },
    { table: 'clubs', from: 'short_name', to: 'name_sh' },
    { table: 'clubs', from: 'six_letter_name', to: 'name_6l' },
    { table: 'clubs', from: 'three_letter_name', to: 'name_3l' },

    // awards
    { table: 'awards', from: 'long_name', to: 'name_lg' },
    { table: 'awards', from: 'short_name', to: 'name_sh' },
    { table: 'awards', from: 'three_letter_name', to: 'name_3l' },
  ];

  for (const r of renames) {
    try {
      const checkRes = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [r.table, r.from]
      );

      if (checkRes.rows.length > 0) {
        console.log(`Renaming ${r.table}.${r.from} -> ${r.to}...`);
        await client.query(`ALTER TABLE ${r.table} RENAME COLUMN ${r.from} TO ${r.to}`);
        console.log(`Renamed ${r.table}.${r.from} -> ${r.to} successfully.`);
      } else {
        const checkNew = await client.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = $1 AND column_name = $2`,
          [r.table, r.to]
        );
        if (checkNew.rows.length > 0) {
          console.log(`Column ${r.table}.${r.to} already exists.`);
        } else {
          console.log(`Column ${r.table}.${r.from} not found, skipping.`);
        }
      }
    } catch (err) {
      console.error(`Error renaming ${r.table}.${r.from}:`, err.message);
    }
  }

  // stadiums.note
  try {
    const checkStadiumNote = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' AND column_name = 'note'`
    );
    if (checkStadiumNote.rows.length > 0) {
      console.log('Dropping stadiums.note column...');
      await client.query(`ALTER TABLE stadiums DROP COLUMN note;`);
      console.log('Dropped stadiums.note column.');
    }
  } catch (err) {
    console.error('Error dropping stadiums.note:', err.message);
  }

  // confederations names
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
    await client.query(`UPDATE confederations SET name = $1 WHERE id = $2`, [c.name, c.id]);
  }
  console.log('Updated confederations names.');

  // Verify
  console.log('\n--- Verification ---');
  const checkNationCols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'nations' ORDER BY ordinal_position`
  );
  console.log('Nations columns:', checkNationCols.rows.map((r) => r.column_name).join(', '));

  const checkConfeds = await client.query('SELECT * FROM confederations ORDER BY id ASC;');
  console.table(checkConfeds.rows);

  await client.end();
  console.log('Render DB migration finished successfully!');
}

main().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
