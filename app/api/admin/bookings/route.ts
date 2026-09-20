import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { bookings, bookingDays } from "@/lib/db/schema";
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

/** Generate a unique booking reference: CA-YYYYMMDD-XXXXXX */
function generateReference(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hex = randomBytes(3).toString("hex").toUpperCase();
  return `CA-${date}-${hex}`;
}

/**
 * POST /api/admin/bookings
 * Admin-only endpoint to manually create a booking, bypassing payment.
 * Body: {
 *   fullName, email, phone, organisation?, eventType, participants,
 *   extras?, notes?,
 *   days: [{ date, startTime, endTime }],
 *   status?: "confirmed" | "pending",
 *   invoiceTotal?, invoiceSubtotal?, paymentStatus?, paymentMethod?
 * }
 */
export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      fullName, organisation, phone, email, eventType,
      participants, extras, notes,
      days: rawDays,
      status = "confirmed",
      invoiceTotal, invoiceSubtotal,
      paymentStatus = "unpaid",
      paymentMethod,
    } = body;

    // ── Basic validation ────────────────────────────────────────────────────
    if (!fullName || String(fullName).trim().length < 2) {
      return NextResponse.json({ error: "Full name is required (min 2 chars)." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!phone || String(phone).trim().length < 5) {
      return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
    }
    if (!Array.isArray(rawDays) || rawDays.length === 0) {
      return NextResponse.json({ error: "At least one day with date, startTime and endTime is required." }, { status: 400 });
    }

    // ── Validate each day entry ─────────────────────────────────────────────
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
    const parsedDays: { date: string; startTime: string; endTime: string }[] = [];
    for (const d of rawDays) {
      if (!d || typeof d !== "object") {
        return NextResponse.json({ error: "Each day must be an object with date, startTime, endTime." }, { status: 400 });
      }
      const date = String(d.date ?? "");
      const startTime = String(d.startTime ?? "").slice(0, 5);
      const endTime = String(d.endTime ?? "").slice(0, 5);
      if (!ISO_DATE.test(date)) {
        return NextResponse.json({ error: `Invalid date format: ${date}` }, { status: 400 });
      }
      if (!HHMM.test(startTime)) {
        return NextResponse.json({ error: `Invalid startTime format: ${startTime}` }, { status: 400 });
      }
      if (!HHMM.test(endTime)) {
        return NextResponse.json({ error: `Invalid endTime format: ${endTime}` }, { status: 400 });
      }
      parsedDays.push({ date, startTime, endTime });
    }
    // Sort by date ascending
    parsedDays.sort((a, b) => a.date.localeCompare(b.date));

    const startDate = parsedDays[0].date;
    const endDate = parsedDays[parsedDays.length - 1].date;
    const startTime = parsedDays.reduce((a, d) => (d.startTime < a ? d.startTime : a), "23:59");
    const endTime = parsedDays.reduce((a, d) => (d.endTime > a ? d.endTime : a), "00:00");

    // ── Generate unique reference ───────────────────────────────────────────
    let reference = generateReference();
    for (let i = 0; i < 3; i++) {
      const existing = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.reference, reference))
        .limit(1);
      if (existing.length === 0) break;
      reference = generateReference();
    }

    // ── Insert booking ──────────────────────────────────────────────────────
    const [insertResult] = await db.insert(bookings).values({
      reference,
      fullName: String(fullName).trim(),
      organisation: organisation ? String(organisation).trim() : null,
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      eventType: String(eventType || "other"),
      startDate: startDate as any,
      endDate: endDate as any,
      startTime,
      endTime,
      participants: Number(participants) || 1,
      extras: Array.isArray(extras) ? extras : [],
      agreedToPolicy: 1, // admin creates on behalf of customer
      status: ["pending", "confirmed", "cancelled"].includes(status) ? status : "confirmed",
      invoiceSubtotal: invoiceSubtotal ? Number(invoiceSubtotal) : null,
      invoiceVat: null,
      invoiceTotal: invoiceTotal ? Number(invoiceTotal) : null,
      paymentStatus: ["unpaid", "paid", "refunded"].includes(paymentStatus) ? paymentStatus : "unpaid",
      paymentMethod: paymentStatus === "paid" ? (paymentMethod || "manual") : null,
      paidAt: paymentStatus === "paid" ? sql`NOW()` : null,
      notes: notes ? String(notes).trim() : null,
    });
    const bookingId = Number(insertResult.insertId);

    // ── Insert booking_days ─────────────────────────────────────────────────
    for (const day of parsedDays) {
      await db.insert(bookingDays).values({
        bookingId,
        dayDate: day.date as any,
        startTime: day.startTime,
        endTime: day.endTime,
      });
    }

    return NextResponse.json({ success: true, reference, bookingId }, { status: 201 });
  } catch (err) {
    console.error("[admin/bookings] POST error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
