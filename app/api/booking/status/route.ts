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

    // Return flat object — the callback page reads this directly as BookingStatus
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[booking/status] error:", err);
    return NextResponse.json({ error: "Failed to fetch booking status" }, { status: 500 });
  }
}
