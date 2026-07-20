import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isOwner } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Background cron — runs automatically (see vercel.json) or can be called
 * manually with the x-cron-secret header.
 *
 * It performs two sweeps every run:
 *
 * 1. GRACE PERIOD EXPIRY
 *    Pending + unpaid bookings that are still in the future but were created
 *    more than 6 hours ago → "expired".  The 6-hour window is the soft-lock
 *    payment grace period.
 *
 * 2. PAST-EVENT CLEANUP
 *    Any booking (pending or confirmed) whose event end date+time is now in
 *    the past is updated:
 *      - confirmed + paid  → "completed"
 *      - pending  + unpaid → "expired"  (no payment ever came through)
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
  const gracePeriodExpired = await sql`
    UPDATE bookings
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
      AND payment_status = 'unpaid'
      AND (end_date > CURRENT_DATE OR (end_date = CURRENT_DATE AND end_time::time > CURRENT_TIME))
      AND created_at < NOW() - INTERVAL '6 hours'
    RETURNING reference
  `;

  // ── 2. Past-event cleanup ──────────────────────────────────────────────────
  // Any pending or confirmed booking whose event end date+time has passed
  // and was never paid → mark expired.
  // NOTE: paid+confirmed past bookings intentionally stay 'confirmed';
  // the DB CHECK constraint only allows: pending | confirmed | cancelled | expired.
  const pastExpired = await sql`
    UPDATE bookings
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'confirmed')
      AND payment_status IN ('unpaid', 'pending')
      AND (end_date < CURRENT_DATE OR (
            end_date = CURRENT_DATE AND
            end_time::time < CURRENT_TIME
          ))
    RETURNING reference
  `;

  return {
    gracePeriodExpired: gracePeriodExpired.map((r) => r.reference),
    pastExpired: pastExpired.map((r) => r.reference),
  };
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSweeps();
    const totalChanged =
      result.gracePeriodExpired.length +
      result.pastExpired.length;

    console.log("[cron/expire-pending]", {
      gracePeriodExpired: result.gracePeriodExpired.length,
      pastExpired: result.pastExpired.length,
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
