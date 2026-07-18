import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Neon serverless SQL client.
 * Use as a tagged template literal:
 *   const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
 */
export const sql = neon(process.env.DATABASE_URL);
