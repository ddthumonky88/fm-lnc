/**
 * migrate_stadium_type.js
 * 
 * Adds `type` VARCHAR(50) DEFAULT 'stadium' to `stadiums` table.
 * Identifies and marks training pitches as 'training pitch', and standard stadiums as 'stadium'.
 * Runs on both Local PostgreSQL and Render PostgreSQL.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Extract training pitch IDs from .lnc file
function getTrainingPitchIds() {
  const lncPath = path.join(__dirname, '../data/FM24 - Club & Stadium.lnc');
  if (!fs.existsSync(lncPath)) {
    console.warn('LNC file not found at:', lncPath);
    return [];
  }
  const content = fs.readFileSync(lncPath, 'utf8');
  const lines = content.split(/\r?\n/);

  let curHeader = '';
  const trainingPitchIds = new Set();

  for (const l of lines) {
    const line = l.trim();
    if (line.startsWith('# STADIUM >')) {
      curHeader = line;
      continue;
    }
    if (line.includes('STADIUM_NAME_CHANGE')) {
      const m = line.match(/"STADIUM_NAME_CHANGE"\s+(\d+)\s+"([^"]*)"/);
      if (m) {
        const id = m[1];
        const name = m[2];
        const headerLower = curHeader.toLowerCase();
        const nameLower = name.toLowerCase();

        const isTraining =
          headerLower.includes('training') ||
          nameLower.includes('training') ||
          nameLower.includes('pitch') ||
          nameLower.includes('football base');

        if (isTraining) {
          trainingPitchIds.add(id);
        }
      }
    }
  }
  return Array.from(trainingPitchIds);
}

async function migrate(client, dbName, trainingPitchIds) {
  console.log(`\n=== Running Stadium Type Migration on ${dbName} ===`);

  // 1. Add column if not exists
  const checkCol = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'stadiums' AND column_name = 'type'`
  );
  if (checkCol.rows.length === 0) {
    console.log('Adding stadiums.type (VARCHAR(50) DEFAULT \'stadium\')...');
    await client.query(`ALTER TABLE stadiums ADD COLUMN type VARCHAR(50) DEFAULT 'stadium';`);
    console.log('Added column stadiums.type.');
  } else {
    console.log('stadiums.type already exists.');
  }

  // 2. Set default 'stadium' for all first
  await client.query(`UPDATE stadiums SET type = 'stadium' WHERE type IS NULL;`);

  // 3. Mark training pitches by extracted IDs from .lnc
  if (trainingPitchIds.length > 0) {
    console.log(`Updating ${trainingPitchIds.length} training pitches from .lnc file...`);
    const chunkSize = 200;
    for (let i = 0; i < trainingPitchIds.length; i += chunkSize) {
      const chunk = trainingPitchIds.slice(i, i + chunkSize);
      const idList = chunk.map(id => `'${id}'`).join(', ');
      await client.query(`UPDATE stadiums SET type = 'training pitch' WHERE id IN (${idList});`);
    }
  }

  // 4. Also mark any stadiums matching keywords in name
  const nameKeywordRes = await client.query(`
    UPDATE stadiums 
    SET type = 'training pitch'
    WHERE type != 'training pitch'
      AND (
        name ILIKE '%training%' 
        OR name ILIKE '%pitch%' 
        OR name ILIKE '%football base%'
      )
    RETURNING id, name;
  `);
  if (nameKeywordRes.rows.length > 0) {
    console.log(`Additional training pitches identified by name keyword: ${nameKeywordRes.rows.length}`);
  }

  // 5. Verification stats
  const countStats = await client.query(`
    SELECT type, count(*)::int as count 
    FROM stadiums 
    GROUP BY type 
    ORDER BY count DESC;
  `);
  console.log('Stadium types distribution:');
  console.table(countStats.rows);
}

async function main() {
  const trainingPitchIds = getTrainingPitchIds();
  console.log(`Extracted ${trainingPitchIds.length} training pitch IDs from LNC.`);

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
    await migrate(localClient, 'Local PostgreSQL', trainingPitchIds);
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
    await migrate(renderClient, 'Render PostgreSQL', trainingPitchIds);
    await renderClient.end();
  } catch (err) {
    console.error('Render DB migration error:', err.message);
  }
}

main().catch(console.error);
