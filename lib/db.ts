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

/**
 * Maps common Postgres/Neon errors to a friendly, actionable message.
 * Returns `null` if the error is not one we specifically recognise.
 * Used by customer-facing auth routes so failures aren't opaque 500s.
 */
export function friendlyDbError(err: unknown): string | null {
  const e = err as { code?: string; message?: string };
  const code = e?.code;
  const msg = e?.message || "";

  if (code === "42P01" || /relation ".*" does not exist/i.test(msg)) {
    return "The accounts database hasn't been set up yet. Please run the latest database migration (005/006) and try again.";
  }
  if (code === "42703" || /column .* does not exist/i.test(msg)) {
    return "The database schema is out of date. Please run the latest database migration and try again.";
  }
  if (code === "23505" || /duplicate key value/i.test(msg)) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(msg)) {
    return "We couldn't reach the database. Please check your connection and try again shortly.";
  }
  return null;
}
