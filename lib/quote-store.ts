import { db } from "./db";
import { quotes } from "./db/schema";
import { eq, gt, lt, sql } from "drizzle-orm";
import type { PricingInput, PricingResult, QuoteLine } from "./pricing";

/**
 * Durable cache for priced quotes.
 *
 * `/api/quote` and `/api/book` must agree on the amount, and in a serverless
 * deployment they routinely run on different instances — so the cache has to
 * outlive the process. MySQL is the source of truth; the in-process Map is
 * just an L1 that saves a round-trip when the same instance handles both calls.
 *
 * A cache miss is never fatal: `getOrCreateQuote` simply recomputes, and the
 * computation is deterministic given the same id.
 */

const L1 = new Map<string, PricingResult>();
/** Keeps the L1 map from growing without bound on a long-lived instance. */
const L1_MAX = 200;

export async function readQuote(quoteId: string): Promise<PricingResult | null> {
  const hit = L1.get(quoteId);
  if (hit) return hit;

  try {
    const rows = await db
      .select({
        quoteId: quotes.quoteId,
        source: quotes.source,
        hours: quotes.hours,
        days: quotes.days,
        lines: quotes.lines,
        baseSubtotal: quotes.baseSubtotal,
        discountAmount: quotes.discountAmount,
        discountApplied: quotes.discountApplied,
        subtotal: quotes.subtotal,
        breakdown: quotes.breakdown,
        vatRate: quotes.vatRate,
        vatAmount: quotes.vatAmount,
        total: quotes.total,
        extrasPriced: quotes.extrasPriced,
      })
      .from(quotes)
      .where(eq(quotes.quoteId, quoteId))
      .limit(1);

    if (rows.length === 0) return null;

    const r = rows[0];
    const result: PricingResult = {
      quoteId: r.quoteId as string,
      source: r.source as "ai" | "deterministic",
      hours: Number(r.hours),
      days: Number(r.days),
      lines: (r.lines ?? []) as QuoteLine[],
      baseSubtotal: Number(r.baseSubtotal),
      discountAmount: Number(r.discountAmount),
      discountApplied: (r.discountApplied as string) ?? "None",
      subtotal: Number(r.subtotal),
      breakdown: (r.breakdown as string) ?? "",
      vatRate: Number(r.vatRate),
      vatAmount: Number(r.vatAmount),
      total: Number(r.total),
      extrasPriced: Boolean(r.extrasPriced),
    };
    remember(quoteId, result);
    return result;
  } catch (err) {
    // A missing `quotes` table (migration 007 not run) must not break booking —
    // pricing still works, it just recomputes every time.
    console.error("[quote-store] read failed:", (err as Error).message);
    return null;
  }
}

export async function writeQuote(
  quoteId: string,
  input: PricingInput,
  result: PricingResult
): Promise<void> {
  remember(quoteId, result);
  try {
    // Two concurrent /api/quote calls for the same inputs race here; whichever
    // lands first wins and both then read the same row.
    // MySQL "INSERT IGNORE" via Drizzle: onDuplicateKeyUpdate with a no-op set.
    await db
      .insert(quotes)
      .values({
        quoteId,
        input: input as any,
        source: result.source,
        hours: String(result.hours),
        days: result.days,
        lines: result.lines as any,
        baseSubtotal: result.baseSubtotal,
        discountAmount: result.discountAmount,
        discountApplied: result.discountApplied,
        subtotal: result.subtotal,
        breakdown: result.breakdown,
        vatRate: String(result.vatRate),
        vatAmount: result.vatAmount,
        total: result.total,
        extrasPriced: result.extrasPriced ? 1 : 0,
      })
      .onDuplicateKeyUpdate({ set: { quoteId: sql`quote_id` } });
  } catch (err) {
    console.error("[quote-store] write failed:", (err as Error).message);
  }
}

/** Called from the expire-pending cron. Returns how many rows were removed. */
export async function purgeExpiredQuotes(): Promise<number> {
  try {
    const result = await db.delete(quotes).where(lt(quotes.expiresAt, sql`NOW()`));
    // Drizzle mysql2 returns [ResultSetHeader, ...] — affectedRows is on [0]
    return (result as any)[0]?.affectedRows ?? 0;
  } catch (err) {
    console.error("[quote-store] purge failed:", (err as Error).message);
    return 0;
  }
}

function remember(quoteId: string, result: PricingResult) {
  if (L1.size >= L1_MAX) {
    const oldest = L1.keys().next().value;
    if (oldest) L1.delete(oldest);
  }
  L1.set(quoteId, result);
}
