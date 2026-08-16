// One-off: bring the stored pricing config's referral note in line with the
// new "refer and earn 5% commission" reward. Migration 009 only seeds on
// insert, so an existing row keeps the old wording until it is updated here.
// Touches nothing else in the config.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

neonConfig.webSocketConstructor = ws;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const pool = new Pool({ connectionString: env.match(/DATABASE_URL="?([^"\n]+)"?/)[1] });

const NEW_NOTE = 'Referral: the referrer earns 5% commission on the booking they refer.';

const { rows } = await pool.query('SELECT config FROM pricing_config WHERE id = 1');
if (rows.length === 0) {
  console.log('no pricing_config row — nothing to update');
} else {
  const config = rows[0].config;
  const before = [...(config.manualNotes ?? [])];
  config.manualNotes = before.map((n) => (/^referral:/i.test(n) ? NEW_NOTE : n));

  if (!config.manualNotes.some((n) => n === NEW_NOTE)) config.manualNotes.push(NEW_NOTE);

  if (JSON.stringify(before) === JSON.stringify(config.manualNotes)) {
    console.log('referral note already up to date');
  } else {
    await pool.query(
      'UPDATE pricing_config SET config = $1::jsonb, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(config)]
    );
    console.log('before:', before.filter((n) => /^referral:/i.test(n)));
    console.log('after :', config.manualNotes.filter((n) => /^referral:/i.test(n)));
  }
}
await pool.end();
