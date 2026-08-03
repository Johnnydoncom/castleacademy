import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const REF_RE = /^CA-\d{8}-[A-F0-9]{6}$/;

/**
 * GET /api/booking/status?ref=CA-XXXXXXXX-XXXXXX
 * Returns the live status of a booking (public — reference acts as the secret).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref || !REF_RE.test(ref)) {
    return NextResponse.json({ error: "Invalid or missing reference" }, { status: 400 });
  }

  try {
    const rows = await db
      .select({
        reference: bookings.reference,
        fullName: bookings.fullName,
        eventType: bookings.eventType,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        participants: bookings.participants,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        invoiceTotal: bookings.invoiceTotal,
        checkoutLink: bookings.checkoutLink,
        paidAt: bookings.paidAt,
      })
      .from(bookings)
      .where(eq(bookings.reference, ref))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const row = rows[0];

    // Drizzle returns MySQL `date` columns as JS Date objects.
    // Serialise them to plain YYYY-MM-DD strings so the client can safely
    // pass them to `new Date("YYYY-MM-DD")` without timezone-shift surprises.
    const toDateStr = (v: unknown): string => {
      if (!v) return "";
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      const s = String(v);
      // Already a YYYY-MM-DD string — return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // ISO datetime string — trim to date portion
      return s.slice(0, 10);
    };

    return NextResponse.json({
      ...row,
      startDate: toDateStr(row.startDate),
      endDate: toDateStr(row.endDate),
    });
  } catch (err) {
    console.error("[booking/status] error:", err);
    return NextResponse.json({ error: "Failed to fetch booking status" }, { status: 500 });
  }
}
