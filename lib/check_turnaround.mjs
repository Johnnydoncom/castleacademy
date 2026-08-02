// Non-destructive check of the per-day conflict query used by /api/book.
// Proves the turnaround boundary without creating a booking.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

neonConfig.webSocketConstructor = ws;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const pool = new Pool({ connectionString: env.match(/DATABASE_URL="?([^"\n]+)"?/)[1] });

const turnaround = Number(
  (await pool.query("SELECT value FROM venue_settings WHERE key='turnaround_minutes'")).rows[0].value
);

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

async function conflicts(date, start, end) {
  const { rows } = await pool.query(
    `SELECT bd.day_date::text AS d, bd.start_time::text AS s, bd.end_time::text AS e
     FROM booking_days bd
     JOIN bookings b ON b.id = bd.booking_id
     JOIN unnest($1::date[], $2::int[], $3::int[]) AS req(d, s, e)
       ON bd.day_date = req.d
      AND (EXTRACT(EPOCH FROM bd.start_time)/60) < req.e + $4
      AND (EXTRACT(EPOCH FROM bd.end_time)/60)   > req.s - $4
     WHERE b.status='confirmed' OR (b.status='pending' AND b.created_at > NOW() - INTERVAL '6 hours')
     LIMIT 1`,
    [[date], [toMin(start)], [toMin(end)], turnaround]
  );
  return rows.length > 0;
}

console.log(`turnaround = ${turnaround} min; existing booking on 2026-07-30 is 10:00–10:30\n`);
const cases = [
  ['2026-07-30', '10:00', '13:00', true,  'direct overlap'],
  ['2026-07-30', '10:30', '13:00', true,  '0 min gap'],
  ['2026-07-30', '10:45', '13:00', true,  '15 min gap'],
  ['2026-07-30', '11:00', '14:00', false, 'exactly 30 min gap — should be ALLOWED'],
  ['2026-07-30', '11:30', '14:00', false, '60 min gap'],
  ['2026-07-30', '08:00', '09:30', false, 'ends 30 min before it starts'],
  ['2026-07-30', '08:00', '09:45', true,  'ends 15 min before it starts'],
];

let fails = 0;
for (const [d, s, e, expected, label] of cases) {
  const got = await conflicts(d, s, e);
  const ok = got === expected;
  if (!ok) fails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${s}-${e}  conflict=${got} (expected ${expected})  ${label}`);
}
console.log(fails === 0 ? '\nAll turnaround boundaries correct.' : `\n${fails} FAILURES`);
await pool.end();
