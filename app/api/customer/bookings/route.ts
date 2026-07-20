import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";

/**
 * GET /api/customer/bookings
 * Returns all bookings belonging to the signed-in customer — matched by
 * customer_id OR (for older guest bookings) their email.
 */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await sql`
      SELECT
        reference, invoice_number, full_name, organisation, email, phone,
        event_type, start_date::text, end_date::text,
        start_time::text, end_time::text, participants, extras,
        status, payment_status, payment_method,
        invoice_subtotal, invoice_vat, invoice_total, discount_applied, invoice_breakdown,
        checkout_link, paid_at, created_at,
        reschedule_status, reschedule_date::text, reschedule_start_time::text,
        reschedule_end_time::text, reschedule_reason
      FROM bookings
      WHERE customer_id = ${session.id}::uuid
         OR LOWER(email) = ${session.email}
      ORDER BY start_date DESC, start_time DESC
    `;

    return NextResponse.json({ bookings: rows });
  } catch (err) {
    console.error("[customer/bookings] error:", err);
    return NextResponse.json({ error: "Failed to load bookings." }, { status: 500 });
  }
}
