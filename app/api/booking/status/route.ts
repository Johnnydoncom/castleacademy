import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/booking/status?ref=CA-YYYYMMDD-XXXXXX
 * Public read-only endpoint. Returns booking status and payment info for a given reference.
 * Used by the /booking/callback page to show post-payment confirmation state.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref || !/^CA-\d{8}-[A-F0-9]{6}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid booking reference" }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT
        reference,
        full_name,
        email,
        event_type,
        start_date::text,
        end_date::text,
        start_time::text,
        end_time::text,
        participants,
        status,
        payment_status,
        invoice_total,
        paid_at
      FROM bookings
      WHERE reference = ${ref}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rows[0];

    return NextResponse.json({
      reference: booking.reference,
      fullName: booking.full_name,
      eventType: booking.event_type,
      startDate: booking.start_date,
      endDate: booking.end_date,
      startTime: booking.start_time?.slice(0, 5),
      endTime: booking.end_time?.slice(0, 5),
      participants: booking.participants,
      status: booking.status,
      paymentStatus: booking.payment_status,
      invoiceTotal: booking.invoice_total,
      paidAt: booking.paid_at,
    });
  } catch (err) {
    console.error("[api/booking/status] Error:", err);
    return NextResponse.json({ error: "Failed to fetch booking status" }, { status: 500 });
  }
}
