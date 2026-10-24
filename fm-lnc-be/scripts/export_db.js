/**
 * export_db.js
 * Export PostgreSQL database to SQL dump file using Node.js + pg library.
 * Run: node scripts/export_db.js
 * Output: scripts/db_dump.sql
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const OUTPUT_FILE = path.resolve(__dirname, 'db_dump.sql');

const TABLES_ORDER = [
  'confederations',
  'nations',
  'cities',
  'competitions',
  'clubs',
  'stadiums',
  'awards',
  'people',
  'stages',
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'fm_lnc_db',
  });

  await client.connect();
  console.log('Connected to database. Exporting...');

  const out = fs.createWriteStream(OUTPUT_FILE);

  out.write('-- FM LNC Manager - Database Export\n');
  out.write(`-- Generated at: ${new Date().toISOString()}\n`);
  out.write('-- PostgreSQL dump\n\n');
  out.write('SET client_encoding = \'UTF8\';\n');
  out.write('SET standard_conforming_strings = on;\n\n');

  // Drop & recreate tables
  out.write('-- Drop existing tables\n');
  for (const t of [...TABLES_ORDER].reverse()) {
    out.write(`DROP TABLE IF EXISTS ${t} CASCADE;\n`);
  }
  out.write('\n');

  // Get CREATE TABLE statements from pg_dump equivalent
  for (const table of TABLES_ORDER) {
    console.log(`Exporting table: ${table}...`);

    // Get column definitions
    const colRes = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    // Get constraints
    const constraintRes = await client.query(`
      SELECT tc.constraint_type, tc.constraint_name, kcu.column_name,
             ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1
    `, [table]);

    let createSQL = `CREATE TABLE ${table} (\n`;
    const colDefs = colRes.rows.map(col => {
      let typeDef = col.data_type;
      if (col.character_maximum_length) typeDef += `(${col.character_maximum_length})`;
      let def = `  ${col.column_name} ${typeDef.toUpperCase()}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      if (col.column_default && !col.column_default.includes('nextval')) def += ` DEFAULT ${col.column_default}`;
      return def;
    });

    const pks = constraintRes.rows.filter(c => c.constraint_type === 'PRIMARY KEY');
    if (pks.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pks.map(p => p.column_name).join(', ')})`);
    }

    const fks = constraintRes.rows.filter(c => c.constraint_type === 'FOREIGN KEY');
    for (const fk of fks) {
      colDefs.push(`  FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`);
    }

    createSQL += colDefs.join(',\n') + '\n);\n\n';
    out.write(createSQL);

    // Export data in batches
    const dataRes = await client.query(`SELECT * FROM ${table} ORDER BY id`);
    const rows = dataRes.rows;

    if (rows.length === 0) {
      out.write(`-- No data in ${table}\n\n`);
      continue;
    }

    const cols = colRes.rows.map(c => c.column_name);
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values = batch.map(row => {
        const vals = cols.map(col => {
          const v = row[col];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'number' || typeof v === 'bigint') return v.toString();
          // Escape string
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        return `(${vals.join(', ')})`;
      }).join(',\n');

      out.write(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${values};\n\n`);
    }

    console.log(`  -> ${rows.length} rows exported`);
  }

  out.write('-- End of dump\n');
  out.end();

  await client.end();
  console.log(`\nExport completed! File: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
