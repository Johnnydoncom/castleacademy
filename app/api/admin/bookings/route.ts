import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, sql, and, like } from "drizzle-orm";
import { cookies } from "next/headers";

async function checkAuth() {
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  if (!token) return false;
  const { verifyToken } = await import("@/lib/auth");
  return verifyToken(token) !== null;
}

/**
 * GET /api/admin/bookings
 * Returns paginated bookings with optional filters.
 * Query params: page, status, payment_status, reference, date
 */
export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 20;
    const offset = (page - 1) * pageSize;
    const statusFilter = searchParams.get("status");
    const paymentStatusFilter = searchParams.get("payment_status");
    const refFilter = searchParams.get("reference");
    const dateFilter = searchParams.get("date");

    // Build dynamic WHERE conditions
    const conditions = [];
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(bookings.status, statusFilter));
    }
    if (paymentStatusFilter && paymentStatusFilter !== "all") {
      conditions.push(eq(bookings.paymentStatus, paymentStatusFilter));
    }
    if (refFilter) {
      conditions.push(like(bookings.reference, `%${refFilter}%`));
    }
    if (dateFilter) {
      conditions.push(eq(bookings.startDate, dateFilter as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Use db.execute with sql for the JSON_ARRAYAGG subquery since Drizzle
    // doesn't have a native builder for correlated subqueries with JSON aggregation.
    const rows = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
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
        status: bookings.status,
        payment_status: bookings.paymentStatus,
        payment_method: bookings.paymentMethod,
        invoice_total: bookings.invoiceTotal,
        invoice_subtotal: bookings.invoiceSubtotal,
        invoice_vat: bookings.invoiceVat,
        discount_applied: bookings.discountApplied,
        invoice_number: bookings.invoiceNumber,
        agreed_to_policy: bookings.agreedToPolicy,
        nomba_order_ref: bookings.nombaOrderRef,
        nomba_transaction_id: bookings.nombaTransactionId,
        checkout_link: bookings.checkoutLink,
        paid_at: bookings.paidAt,
        reschedule_status: bookings.rescheduleStatus,
        reschedule_date: bookings.rescheduleDate,
        reschedule_start_time: bookings.rescheduleStartTime,
        reschedule_end_time: bookings.rescheduleEndTime,
        reschedule_reason: bookings.rescheduleReason,
        days: sql`(SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'date', DATE_FORMAT(bd.day_date, '%Y-%m-%d'),
                      'startTime', TIME_FORMAT(bd.start_time, '%H:%i'),
                      'endTime', TIME_FORMAT(bd.end_time, '%H:%i')
                    ) ORDER BY bd.day_date
                  )
                  FROM booking_days bd WHERE bd.booking_id = ${bookings.id})`,
        created_at: bookings.createdAt,
        updated_at: bookings.updatedAt,
        notes: bookings.notes,
      })
      .from(bookings)
      .where(whereClause)
      .orderBy(sql`${bookings.createdAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    const countRows = await db
      .select({ total: sql<number>`CAST(COUNT(*) AS UNSIGNED)` })
      .from(bookings)
      .where(whereClause);

    return NextResponse.json({
      bookings: rows,
      total: countRows[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[admin/bookings] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/bookings
 * Update a booking's status, notes, or manually mark as paid.
 * Body: { id: string, status?: string, notes?: string, action?: "mark_paid" }
 *
 * action="mark_paid": Sets payment_status='paid', status='confirmed',
 *                     payment_method='manual'. Used for offline/cash payments.
 */
export async function PATCH(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, notes, action } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    // ── Reschedule approval: apply requested slot to the booking ──────────
    if (action === "approve_reschedule") {
      const rows = await db
        .select({
          d: bookings.rescheduleDate,
          s: bookings.rescheduleStartTime,
          e: bookings.rescheduleEndTime,
        })
        .from(bookings)
        .where(eq(bookings.id, Number(id)))
        .limit(1);
      if (rows.length === 0 || !rows[0].d) {
        return NextResponse.json({ error: "No pending reschedule request" }, { status: 400 });
      }
      await db
        .update(bookings)
        .set({
          startDate: rows[0].d,
          endDate: rows[0].d,
          startTime: rows[0].s!,
          endTime: rows[0].e!,
          rescheduleStatus: "approved",
          updatedAt: sql`NOW()`,
        })
        .where(eq(bookings.id, Number(id)));
      return NextResponse.json({ success: true, message: "Reschedule approved and applied" });
    }

    if (action === "reject_reschedule") {
      await db
        .update(bookings)
        .set({ rescheduleStatus: "rejected", updatedAt: sql`NOW()` })
        .where(eq(bookings.id, Number(id)));
      return NextResponse.json({ success: true, message: "Reschedule request declined" });
    }

    // Handle "mark as paid" action for offline/manual payments
    if (action === "mark_paid") {
      await db
        .update(bookings)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          paymentMethod: "manual",
          paidAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(bookings.id, Number(id)));
      return NextResponse.json({ success: true, message: "Booking marked as paid and confirmed" });
    }

    // Standard status/notes update
    if (status && !["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: sql`NOW()` };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/bookings] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
