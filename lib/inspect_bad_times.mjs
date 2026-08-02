// One-off audit: bookings whose end_time is not after start_time.
// These predate the server-side validation added with per-day scheduling and
// cannot be expressed as a valid booking_days row.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

neonConfig.webSocketConstructor = ws;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const dbUrl = env.match(/DATABASE_URL="?([^"\n]+)"?/)?.[1];
const pool = new Pool({ connectionString: dbUrl });

const bad = await pool.query(`
  SELECT reference, status, payment_status, start_date::text, end_date::text,
         start_time::text, end_time::text, full_name, email
  FROM bookings
  WHERE end_time <= start_time
  ORDER BY start_date
`);
const total = await pool.query(`SELECT count(*)::int AS n FROM bookings`);

console.log(`bookings total: ${total.rows[0].n}`);
console.log(`bookings with end_time <= start_time: ${bad.rows.length}`);
for (const r of bad.rows) {
  console.log(`  ${r.reference}  ${r.start_date}${r.end_date !== r.start_date ? '→' + r.end_date : ''}  ${r.start_time.slice(0,5)}–${r.end_time.slice(0,5)}  ${r.status}/${r.payment_status}  ${r.full_name} <${r.email}>`);
}
await pool.end();
