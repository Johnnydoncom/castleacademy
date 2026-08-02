import { createHash } from "crypto";
import { db } from "./db";
import { pricingConfig } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import {
  normalisePricingConfig,
  DEFAULT_PRICING_CONFIG,
  type PricingConfig,
} from "./pricing-config";

/**
 * Database access for the pricing structure. Server-only.
 *
 * Kept apart from `lib/pricing-config.ts` so the admin editor (a client
 * component) can import the types and defaults without dragging `lib/db` into
 * the browser bundle.
 */

// Cached per instance and revalidated on `updated_at`, so an admin edit is
// picked up on the next request without restarting anything.
let cache: { stamp: string; config: PricingConfig; hash: string } | null = null;

export async function loadPricingConfig(): Promise<{
  config: PricingConfig;
  /** Short hash — part of the quote cache key, so edits invalidate old quotes. */
  hash: string;
}> {
  try {
    const rows = await db
      .select({ config: pricingConfig.config, stamp: pricingConfig.updatedAt })
      .from(pricingConfig)
      .where(eq(pricingConfig.id, 1));

    if (rows.length === 0) throw new Error("no pricing_config row");

    if (cache && cache.stamp === String(rows[0].stamp)) {
      return { config: cache.config, hash: cache.hash };
    }

    const config = normalisePricingConfig(rows[0].config);
    const hash = hashConfig(config);
    cache = { stamp: String(rows[0].stamp), config, hash };
    return { config, hash };
  } catch (err) {
    // Pricing must not fall over because the table is missing or unreachable.
    console.error("[pricing-config] load failed, using defaults:", (err as Error).message);
    const config = DEFAULT_PRICING_CONFIG;
    return { config, hash: hashConfig(config) };
  }
}

/**
 * Serialise with object keys sorted, so the hash depends on the config's
 * *content* and not on key order. Postgres does not preserve JSONB key order,
 * so a plain JSON.stringify produced a different hash for identical settings —
 * harmless for correctness (the prices matched) but it needlessly missed the
 * quote cache on every read.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashConfig(config: PricingConfig): string {
  return createHash("sha256").update(stableStringify(config)).digest("hex").slice(0, 16);
}

export async function savePricingConfig(
  raw: unknown,
  updatedBy: string
): Promise<PricingConfig> {
  const config = normalisePricingConfig(raw);
  await db
    .update(pricingConfig)
    .set({
      config: config as any,
      updatedAt: sql`NOW()`,
      updatedBy,
    })
    .where(eq(pricingConfig.id, 1));
  cache = null;
  return config;
}
