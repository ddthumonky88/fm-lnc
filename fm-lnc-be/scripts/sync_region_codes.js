/**
 * sync_region_codes.js
 * Scans 'data/FM24 - City & Nation.lnc' and updates regions.code based on header comments:
 * e.g. "# CITY > [ALG] ALGERIA > [ALG-05] Batna" => code = 'ALG-05', name = 'Batna', nation = 'ALG'
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const RENDER_URL =
  process.env.DATABASE_URL ||
  'postgresql://fm_user:OS8WEWD7UsPMWgYmsKURYFMpSSlbkY9z@dpg-dbcmf50m7kps73c7kcsg-a.singapore-postgres.render.com/fm_lnc_db';

async function main() {
  const isLocal = process.env.USE_LOCAL === '1' || process.argv.includes('--local') || !process.env.DATABASE_URL;
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
    await client.query('ALTER TABLE regions ADD COLUMN IF NOT EXISTS code VARCHAR(64);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);');

    const lncPath = path.resolve(__dirname, '../data/FM24 - City & Nation.lnc');
    if (!fs.existsSync(lncPath)) {
      console.log('File not found:', lncPath);
      return;
    }

    const nRes = await client.query('SELECT id, name_3l, name_lg FROM nations');
    const natMap = {};
    for (const n of nRes.rows) {
      if (n.name_3l) natMap[n.name_3l.toUpperCase().trim()] = n.id;
      if (n.name_lg) natMap[n.name_lg.toUpperCase().trim()] = n.id;
    }

    const lines = fs.readFileSync(lncPath, 'utf8').split(/\r?\n/);
    const lineRegex = /^#\s*CITY\s*>\s*\[([^\]]+)\]\s*([^>]+)>\s*\[([^\]]+)\]\s*(.*)$/;

    let updatedCount = 0;
    const updates = new Map(); // key: "nationId:regName" -> regCode

    for (const l of lines) {
      const m = l.match(lineRegex);
      if (m) {
        const natCode = m[1].trim().toUpperCase();
        const regCode = m[3].trim();
        const regName = m[4].trim();
        const natId = natMap[natCode];
        if (natId && regName) {
          const key = `${natId}:::${regName.toLowerCase()}`;
          updates.set(key, { natId, regCode, regName });
        }
      }
    }

    console.log(`Found ${updates.size} unique (nation, region) mappings with codes.`);

    for (const item of updates.values()) {
      const res = await client.query(
        'UPDATE regions SET code = $1 WHERE nation_id = $2 AND LOWER(name) = LOWER($3) AND (code IS NULL OR code != $1)',
        [item.regCode, item.natId, item.regName]
      );
      updatedCount += res.rowCount;
    }

    console.log(`Updated region codes for ${updatedCount} records.`);

    const countRes = await client.query('SELECT count(*) as cnt FROM regions WHERE code IS NOT NULL');
    console.log(`Total regions with code in DB: ${countRes.rows[0].cnt}`);
  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    await client.end();
  }
}

main();
