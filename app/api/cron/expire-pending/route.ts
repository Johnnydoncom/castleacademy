import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isOwner } from "@/lib/auth";

/**
 * Marks stale unpaid pending bookings as "expired".
 * A booking expires if it is still pending + unpaid more than 6 hours after
 * creation (the soft-lock window). Expiring them keeps the admin/customer
 * views clean — availability already frees the slot after 6h.
 *
 * Auth: either an owner admin session, OR a matching `x-cron-secret` header
 * (set CRON_SECRET, falls back to ADMIN_SECRET) so it can be called by an
 * external scheduler / cron job.
 *
 * Works with GET (easy cron) and POST.
 */
async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (secret && provided && provided === secret) return true;
  return isOwner();
}

async function expire() {
  const rows = await sql`
    UPDATE bookings
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
      AND payment_status = 'unpaid'
      AND created_at < NOW() - INTERVAL '6 hours'
    RETURNING reference
  `;
  return rows.map((r) => r.reference);
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expired = await expire();
  return NextResponse.json({ success: true, expiredCount: expired.length, expired });
}

export async function POST(req: Request) {
  return GET(req);
}
