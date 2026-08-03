/**
 * Drizzle ORM instance — Namecheap MySQL 8
 *
 * Uses mysql2 connection pool under the hood.
 * Import `db` for Drizzle query-builder operations.
 * Import schema tables from `@/lib/db/schema` for type-safe queries.
 */
import { config } from 'dotenv';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import * as schema from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

export { sql } from "drizzle-orm";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

const pool =
  globalForDb.pool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema, mode: "default" } as any);

/**
 * Maps common MySQL error codes to user-friendly messages.
 * Returns null for unrecognised errors so the caller can fall back to a generic.
 */
export function friendlyDbError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = ((err as any).code || (err as any).cause?.code) as string | undefined;
  switch (code) {
    case "ER_DUP_ENTRY":
      return "A record with those details already exists.";
    case "ER_NO_REFERENCED_ROW":
    case "ER_NO_REFERENCED_ROW_2":
      return "Referenced record not found.";
    case "ER_DATA_TOO_LONG":
      return "One of the values is too long.";
    case "ECONNRESET":
    case "PROTOCOL_CONNECTION_LOST":
    case "ETIMEDOUT":
    case "ECONNREFUSED":
    case "ENOTFOUND":
      return "Database connection was reset. Please try again.";
    default:
      return null;
  }
}
