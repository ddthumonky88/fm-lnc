const { Client } = require('../node_modules/@types/pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'fm_lnc_db',
  });

  await client.connect();
  console.log('Connected to DB');

  try {
    await client.query('BEGIN');

    // Insert missing Oman competitions if needed
    await client.query(`
      INSERT INTO competitions (id, long_name, short_name, confed_id, nation_id)
      VALUES 
        (23237487, 'Oman First Division League Group A', 'Oman First Division Group A', 2, (SELECT id FROM nations WHERE three_letter_name = 'OMA' LIMIT 1)),
        (23237488, 'Oman First Division League Group B', 'Oman First Division Group B', 2, (SELECT id FROM nations WHERE three_letter_name = 'OMA' LIMIT 1))
      ON CONFLICT (id) DO NOTHING;
    `);

    const filePath = path.resolve(__dirname, '../../FM24 - Club & Stadium.lnc');
    console.log('Reading:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let curCompId = null;
    let curExtra = null;
    let updated = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('# CLUB >')) {
        const parts = line.split('>').map((p) => p.trim());
        curCompId = null;
        curExtra = null;
        if (parts.length > 3) {
          const compPart = parts[3];
          const m = compPart.match(/\[(\d+)\]\s*(.*?)(?:\s+(\([^)]+\)))?$/);
          if (m) {
            curCompId = parseInt(m[1], 10);
            if (m[3]) {
              curExtra = m[3].trim();
            }
          }
        }
        continue;
      }

      if (line.includes('CLUB_NAME_CHANGE')) {
        const tokens = line.split(/\s+/);
        // "CLUB_NAME_CHANGE"  123001 ...
        // tokens[0] may be #"CLUB_NAME_CHANGE" or "CLUB_NAME_CHANGE"
        const clubId = parseInt(tokens[1], 10);
        if (!isNaN(clubId) && curCompId) {
          const res = await client.query(
            'UPDATE clubs SET comp_id = $1 WHERE id = $2 AND comp_id IS NULL',
            [curCompId, clubId]
          );
          if (res.rowCount > 0) {
            updated++;
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully updated comp_id for ${updated} clubs!`);

    const resCount = await client.query('SELECT count(*) FROM clubs WHERE comp_id IS NOT NULL');
    console.log(`Total clubs now linked to a competition: ${resCount.rows[0].count}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update clubs:', err);
  } finally {
    await client.end();
  }
}

main();
