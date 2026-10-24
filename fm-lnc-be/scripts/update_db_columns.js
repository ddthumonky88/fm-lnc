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

  const renames = [
    // nations
    { table: 'nations', from: 'long_name', to: 'name_lg' },
    { table: 'nations', from: 'short_name', to: 'name_sh' },
    { table: 'nations', from: 'three_letter_name', to: 'name_3l' },

    // cities
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
      // Check if old column exists
      const checkRes = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [r.table, r.from]
      );

      if (checkRes.rows.length > 0) {
        console.log(`Renaming column ${r.table}.${r.from} -> ${r.to}...`);
        await client.query(`ALTER TABLE ${r.table} RENAME COLUMN ${r.from} TO ${r.to}`);
        console.log(`Renamed ${r.table}.${r.from} -> ${r.to} successfully.`);
      } else {
        // Check if new column already exists
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

  await client.end();
  console.log('Finished updating database columns.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
