import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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

    const isStatusAll = !statusFilter || statusFilter === "all";
    const isPaymentAll = !paymentStatusFilter || paymentStatusFilter === "all";
    const refParam = refFilter ? `%${refFilter}%` : null;

    const rows = await sql`
      SELECT id, reference, full_name, organisation, email, phone,
             event_type, start_date::text, end_date::text,
             start_time::text, end_time::text, participants,
             status, payment_status, payment_method, invoice_total,
             invoice_subtotal, invoice_vat, discount_applied, invoice_number,
             agreed_to_policy, nomba_order_ref, nomba_transaction_id,
             checkout_link, paid_at,
             reschedule_status, reschedule_date::text, reschedule_start_time::text,
             reschedule_end_time::text, reschedule_reason,
             created_at, updated_at, notes
      FROM bookings
      WHERE (${isStatusAll} OR status = ${statusFilter})
        AND (${isPaymentAll} OR payment_status = ${paymentStatusFilter})
        AND (${!refFilter} OR reference ILIKE ${refParam})
        AND (${!dateFilter} OR start_date = ${dateFilter}::date)
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)::int AS total 
      FROM bookings 
      WHERE (${isStatusAll} OR status = ${statusFilter})
        AND (${isPaymentAll} OR payment_status = ${paymentStatusFilter})
        AND (${!refFilter} OR reference ILIKE ${refParam})
        AND (${!dateFilter} OR start_date = ${dateFilter}::date)
    `;

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
      const rows = await sql`
        SELECT reschedule_date::text AS d, reschedule_start_time::text AS s, reschedule_end_time::text AS e
        FROM bookings WHERE id = ${id}::uuid LIMIT 1
      `;
      if (rows.length === 0 || !rows[0].d) {
        return NextResponse.json({ error: "No pending reschedule request" }, { status: 400 });
      }
      await sql`
        UPDATE bookings SET
          start_date        = ${rows[0].d}::date,
          end_date          = ${rows[0].d}::date,
          start_time        = ${rows[0].s}::time,
          end_time          = ${rows[0].e}::time,
          reschedule_status = 'approved',
          updated_at        = NOW()
        WHERE id = ${id}::uuid
      `;
      return NextResponse.json({ success: true, message: "Reschedule approved and applied" });
    }

    if (action === "reject_reschedule") {
      await sql`
        UPDATE bookings SET reschedule_status = 'rejected', updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
      return NextResponse.json({ success: true, message: "Reschedule request declined" });
    }

    // Handle "mark as paid" action for offline/manual payments
    if (action === "mark_paid") {
      await sql`
        UPDATE bookings
        SET
          status         = 'confirmed',
          payment_status = 'paid',
          payment_method = 'manual',
          paid_at        = NOW(),
          updated_at     = NOW()
        WHERE id = ${id}::uuid
      `;
      return NextResponse.json({ success: true, message: "Booking marked as paid and confirmed" });
    }

    // Standard status/notes update
    if (status && !["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    await sql`
      UPDATE bookings
      SET
        status     = COALESCE(${status ?? null}, status),
        notes      = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/bookings] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
