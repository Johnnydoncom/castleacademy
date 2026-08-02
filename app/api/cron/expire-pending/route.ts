import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { isOwner } from "@/lib/auth";
import { purgeExpiredQuotes } from "@/lib/quote-store";

export const runtime = "nodejs";

/**
 * Background cron — runs automatically (see vercel.json) or can be called
 * manually with the x-cron-secret header.
 *
 * It performs two sweeps every run:
 *
 * 1. GRACE PERIOD EXPIRY
 *    Pending + unpaid bookings that are still in the future but were created
 *    more than 6 hours ago → "expired".
 *
 * 2. PAST-EVENT CLEANUP
 *    Any booking (pending or confirmed) whose event end date+time is now in
 *    the past is updated:
 *      - confirmed + paid  → "completed"
 *      - pending  + unpaid → "expired"
 *      - anything else     → "expired"
 *
 * Auth: owner admin session  OR  x-cron-secret header.
 */

async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (secret && provided && provided === secret) return true;
  return isOwner();
}

async function runSweeps() {
  // ── 1. Grace-period expiry (future bookings, unpaid > 6h) ─────────────────
  const graceResult = await db
    .update(bookings)
    .set({ status: "expired", updatedAt: sql`NOW()` })
    .where(
      and(
        eq(bookings.status, "pending"),
        eq(bookings.paymentStatus, "unpaid"),
        sql`(${bookings.endDate} > CURDATE() OR (${bookings.endDate} = CURDATE() AND ${bookings.endTime} > CURTIME()))`,
        sql`${bookings.createdAt} < DATE_SUB(NOW(), INTERVAL 6 HOUR)`
      )
    );
  const gracePeriodExpired = (graceResult as any)[0]?.affectedRows ?? 0;

  // ── 2. Past-event cleanup ──────────────────────────────────────────────────
  const pastResult = await db
    .update(bookings)
    .set({ status: "expired", updatedAt: sql`NOW()` })
    .where(
      and(
        sql`${bookings.status} IN ('pending', 'confirmed')`,
        sql`${bookings.paymentStatus} IN ('unpaid', 'pending')`,
        sql`(${bookings.endDate} < CURDATE() OR (${bookings.endDate} = CURDATE() AND ${bookings.endTime} < CURTIME()))`
      )
    );
  const pastExpired = (pastResult as any)[0]?.affectedRows ?? 0;

  // ── 3. Drop stale price quotes ─────────────────────────────────────────────
  const purgedQuotes = await purgeExpiredQuotes();

  return { gracePeriodExpired, pastExpired, purgedQuotes };
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSweeps();
    const totalChanged = result.gracePeriodExpired + result.pastExpired;

    console.log("[cron/expire-pending]", {
      gracePeriodExpired: result.gracePeriodExpired,
      pastExpired: result.pastExpired,
    });

    return NextResponse.json({
      success: true,
      totalChanged,
      ...result,
    });
  } catch (err) {
    console.error("[cron/expire-pending] failed:", err);
    return NextResponse.json(
      { error: "Cron job failed", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
