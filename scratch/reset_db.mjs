import { db, sql } from "../lib/db/index.ts";

async function main() {
  console.log("Dropping old tables to allow fresh migration...");
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
  await db.execute(sql`DROP TABLE IF EXISTS password_reset_tokens, booking_days, bookings, blocked_slots, customers, admins, quotes, venue_hours, social_links, venue_settings, pricing_config;`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);
  console.log("Database cleared successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
