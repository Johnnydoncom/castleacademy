// Verifies that editing pricing_config changes quotes immediately and
// invalidates cached quote ids. Restores the original config on exit.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: env.match(/DATABASE_URL="?([^"\n]+)"?/)[1] });
const one = async (text, params) => (await pool.query(text, params)).rows[0];

const read = async () => (await one('SELECT config FROM pricing_config WHERE id = 1')).config;

const setHours3 = async (v) => {
  const cfg = await read();
  cfg.packages.hours3 = v;
  await pool.query('UPDATE pricing_config SET config = $1::jsonb, updated_at = NOW() WHERE id = 1', [JSON.stringify(cfg)]);
};

const quote = async () => {
  const r = await fetch('http://localhost:3000/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days: [{ date: '2026-08-05', startTime: '09:00', endTime: '12:00' }],
      participants: 10,
    }),
  });
  const d = await r.json();
  return { subtotal: d.subtotal, total: d.total, id: d.quoteId?.slice(0, 12) };
};

const original = await read();
const originalHours3 = original.packages.hours3;
console.log(`stored 3-hour rate on entry: ${originalHours3.toLocaleString()}`);

try {
  console.log('  before edit         ', JSON.stringify(await quote()));
  await setHours3(111000);
  await new Promise((r) => setTimeout(r, 500));
  console.log('  3h rate -> 111,000  ', JSON.stringify(await quote()));
} finally {
  await pool.query('UPDATE pricing_config SET config = $1::jsonb, updated_at = NOW() WHERE id = 1', [JSON.stringify(original)]);
  await new Promise((r) => setTimeout(r, 500));
  console.log('  restored            ', JSON.stringify(await quote()));
  const now = (await read()).packages.hours3;
  console.log(now === originalHours3 ? 'config restored OK' : `!! config left at ${now}`);
  await pool.end();
}
