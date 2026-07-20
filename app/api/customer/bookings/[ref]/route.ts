import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { resendInvoiceEmail, resendReceiptEmail, notifyAdminReschedule } from "@/lib/mailer";
import type { InvoiceBooking } from "@/lib/invoice";

const REF_RE = /^CA-\d{8}-[A-F0-9]{6}$/;

async function loadOwnedBooking(ref: string, session: { id: string; email: string }) {
  const rows = await sql`
    SELECT * FROM bookings
    WHERE reference = ${ref}
      AND (customer_id = ${session.id}::uuid OR LOWER(email) = ${session.email})
    LIMIT 1
  `;
  return rows[0] || null;
}

/** GET /api/customer/bookings/[ref] — single booking (owned by customer) */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ref } = await params;
  if (!REF_RE.test(ref)) return NextResponse.json({ error: "Invalid reference" }, { status: 400 });

  const booking = await loadOwnedBooking(ref, session);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

/**
 * POST /api/customer/bookings/[ref]
 * Body: { action: "reschedule" | "resend", ... }
 *   reschedule: { date, startTime, endTime, reason? }
 *   resend: re-emails invoice (unpaid) or receipt (paid)
 */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ref } = await params;
  if (!REF_RE.test(ref)) return NextResponse.json({ error: "Invalid reference" }, { status: 400 });

  const booking = await loadOwnedBooking(ref, session);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    // ── Resend invoice / receipt ─────────────────────────────────────────
    if (action === "resend") {
      const ib = booking as unknown as InvoiceBooking;
      const sent =
        booking.payment_status === "paid"
          ? await resendReceiptEmail(ib)
          : await resendInvoiceEmail(ib);
      if (!sent) {
        return NextResponse.json({ error: "Email is not configured. Please contact support." }, { status: 503 });
      }
      return NextResponse.json({ success: true, message: "Email sent to " + booking.email });
    }

    // ── Request a reschedule ─────────────────────────────────────────────
    if (action === "reschedule") {
      const date = String(body.date || "");
      const startTime = String(body.startTime || "");
      const endTime = String(body.endTime || "");
      const reason = body.reason ? String(body.reason).trim() : null;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !startTime || !endTime) {
        return NextResponse.json({ error: "Please provide a valid new date, start and end time." }, { status: 400 });
      }
      if (endTime <= startTime) {
        return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
      }
      if (!["pending", "confirmed"].includes(booking.status)) {
        return NextResponse.json({ error: "This booking cannot be rescheduled." }, { status: 400 });
      }
      if (booking.reschedule_status === "requested") {
        return NextResponse.json({ error: "A reschedule request is already pending review." }, { status: 409 });
      }

      // Policy: free rescheduling only when more than 7 days before the event.
      const eventDate = new Date(booking.start_date + "T00:00:00");
      const daysUntil = Math.floor((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 7) {
        return NextResponse.json(
          { error: "Reschedules must be requested more than 7 days before the event. Please contact us directly." },
          { status: 400 }
        );
      }

      await sql`
        UPDATE bookings SET
          reschedule_status       = 'requested',
          reschedule_date         = ${date}::date,
          reschedule_start_time   = ${startTime}::time,
          reschedule_end_time     = ${endTime}::time,
          reschedule_reason       = ${reason},
          reschedule_requested_at = NOW(),
          updated_at              = NOW()
        WHERE reference = ${ref}
      `;

      // Fire-and-forget admin notification
      notifyAdminReschedule(booking as unknown as InvoiceBooking, { date, startTime, endTime, reason: reason || undefined })
        .catch((e) => console.error("[reschedule] admin email failed:", e));

      return NextResponse.json({ success: true, message: "Reschedule request submitted for review." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[customer/bookings/:ref] POST error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
