import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, bookingDays } from "@/lib/db/schema";
import { eq, and, or, sql, desc } from "drizzle-orm";
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
    // Auto-expire unpaid pending bookings that are past the 6-hour grace period.
    await db
      .update(bookings)
      .set({ status: "expired", updatedAt: sql`NOW()` })
      .where(
        and(
          eq(bookings.status, "pending"),
          eq(bookings.paymentStatus, "unpaid"),
          sql`${bookings.createdAt} < DATE_SUB(NOW(), INTERVAL 6 HOUR)`,
          sql`(${bookings.customerId} = ${session.id} OR LOWER(${bookings.email}) = ${session.email})`
        )
      )
      .catch((e: Error) => console.error("[customer/bookings] auto-expire failed:", e));

    const rows = await db
      .select({
        reference: bookings.reference,
        invoice_number: bookings.invoiceNumber,
        full_name: bookings.fullName,
        organisation: bookings.organisation,
        email: bookings.email,
        phone: bookings.phone,
        event_type: bookings.eventType,
        start_date: bookings.startDate,
        end_date: bookings.endDate,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        participants: bookings.participants,
        extras: bookings.extras,
        status: bookings.status,
        payment_status: bookings.paymentStatus,
        payment_method: bookings.paymentMethod,
        invoice_subtotal: bookings.invoiceSubtotal,
        invoice_vat: bookings.invoiceVat,
        invoice_total: bookings.invoiceTotal,
        discount_applied: bookings.discountApplied,
        invoice_breakdown: bookings.invoiceBreakdown,
        checkout_link: bookings.checkoutLink,
        paid_at: bookings.paidAt,
        created_at: bookings.createdAt,
        reschedule_status: bookings.rescheduleStatus,
        reschedule_date: bookings.rescheduleDate,
        reschedule_start_time: bookings.rescheduleStartTime,
        reschedule_end_time: bookings.rescheduleEndTime,
        reschedule_reason: bookings.rescheduleReason,
        // Real per-day schedule via correlated subquery (JSON_ARRAYAGG)
        days: sql`(SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'date', DATE_FORMAT(bd.day_date, '%Y-%m-%d'),
                      'startTime', TIME_FORMAT(bd.start_time, '%H:%i'),
                      'endTime', TIME_FORMAT(bd.end_time, '%H:%i')
                    ) ORDER BY bd.day_date
                  )
                  FROM booking_days bd WHERE bd.booking_id = ${bookings.id})`,
      })
      .from(bookings)
      .where(
        sql`${bookings.customerId} = ${session.id} OR LOWER(${bookings.email}) = ${session.email}`
      )
      .orderBy(sql`${bookings.startDate} DESC, ${bookings.startTime} DESC`);

    return NextResponse.json({ bookings: rows });
  } catch (err) {
    console.error("[customer/bookings] error:", err);
    return NextResponse.json({ error: "Failed to load bookings." }, { status: 500 });
  }
}
