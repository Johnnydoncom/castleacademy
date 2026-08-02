// Test helper: create or remove a single-day confirmed booking so availability
// behaviour can be checked against real data.
//   node lib/seed_test_booking.mjs add 2026-08-03 10:00 14:00
//   node lib/seed_test_booking.mjs remove
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

neonConfig.webSocketConstructor = ws;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const pool = new Pool({ connectionString: env.match(/DATABASE_URL="?([^"\n]+)"?/)[1] });

const REF = 'CA-TESTSLOT-0001';
const [action, date, start, end] = process.argv.slice(2);

async function remove() {
  const r = await pool.query('DELETE FROM bookings WHERE reference = $1 RETURNING id', [REF]);
  console.log(`removed ${r.rowCount} test booking(s)`);
}

if (action === 'remove') {
  await remove();
} else if (action === 'add') {
  await remove();
  const ins = await pool.query(
    `INSERT INTO bookings (reference, full_name, organisation, phone, email, event_type,
       start_date, end_date, start_time, end_time, participants, extras,
       agreed_to_policy, status, payment_status)
     VALUES ($1,'Slot Test',NULL,'08030000000','slottest@example.com','training',
       $2::date,$2::date,$3::time,$4::time,10,'{}',true,'confirmed','paid')
     RETURNING id`,
    [REF, date, start, end]
  );
  await pool.query(
    `INSERT INTO booking_days (booking_id, day_date, start_time, end_time)
     VALUES ($1,$2::date,$3::time,$4::time)`,
    [ins.rows[0].id, date, start, end]
  );
  console.log(`added confirmed booking ${REF}: ${date} ${start}-${end}`);
} else {
  console.log('usage: add <date> <start> <end> | remove');
}
await pool.end();
