import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, venueHours, bookingDays, blockedSlots } from "@/lib/db/schema";
import { eq, and, or, ne, sql } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";
import { resendInvoiceEmail, resendReceiptEmail, notifyAdminReschedule } from "@/lib/mailer";
import { createCheckoutOrder } from "@/lib/nomba";
import type { InvoiceBooking } from "@/lib/invoice";

const REF_RE = /^CA-\d{8}-[A-F0-9]{6}$/;
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";

function parseMinutes(timeStr: string): number {
  const [h, m] = String(timeStr).slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

async function loadOwnedBooking(ref: string, session: { id: string; email: string }) {
  const rows = await db
    .select()
    .from(bookings)
    .where(
      sql`${bookings.reference} = ${ref} AND (${bookings.customerId} = ${session.id} OR LOWER(${bookings.email}) = ${session.email})`
    )
    .limit(1);
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
 * Body: { action: "reschedule" | "resend" | "generate_checkout" | "cancel", ... }
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
        booking.paymentStatus === "paid"
          ? await resendReceiptEmail(ib)
          : await resendInvoiceEmail(ib);
      if (!sent) {
        return NextResponse.json({ error: "Email is not configured. Please contact support." }, { status: 503 });
      }
      return NextResponse.json({ success: true, message: "Email sent to " + booking.email });
    }

    // ── Generate a fresh Nomba checkout link ─────────────────────────────
    if (action === "generate_checkout") {
      if (booking.paymentStatus === "paid") {
        return NextResponse.json({ error: "This booking is already paid." }, { status: 409 });
      }
      if (!["pending", "confirmed"].includes(booking.status)) {
        return NextResponse.json({ error: "Cannot generate a payment link for this booking." }, { status: 400 });
      }
      if (!booking.invoiceTotal || Number(booking.invoiceTotal) <= 0) {
        return NextResponse.json({ error: "Booking has no invoice total. Please contact support." }, { status: 400 });
      }

      const nombaOrder = await createCheckoutOrder({
        orderReference: ref + "-" + Date.now(),
        amount: Number(booking.invoiceTotal),
        customerEmail: booking.email,
        callbackUrl: `${APP_URL}/booking/callback?ref=${ref}`,
      });

      await db
        .update(bookings)
        .set({
          nombaOrderRef: nombaOrder.orderReference,
          checkoutLink: nombaOrder.checkoutLink,
          updatedAt: sql`NOW()`,
        })
        .where(eq(bookings.reference, ref));

      return NextResponse.json({
        success: true,
        checkoutLink: nombaOrder.checkoutLink,
        message: "Payment link generated.",
      });
    }

    // ── Cancel an unpaid pending booking ─────────────────────────────────
    if (action === "cancel") {
      if (booking.paymentStatus === "paid") {
        return NextResponse.json(
          { error: "Paid bookings cannot be cancelled. Please contact us directly." },
          { status: 409 }
        );
      }
      if (booking.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending bookings can be cancelled." },
          { status: 400 }
        );
      }

      await db
        .update(bookings)
        .set({ status: "cancelled", updatedAt: sql`NOW()` })
        .where(eq(bookings.reference, ref));

      return NextResponse.json({ success: true, message: "Booking cancelled." });
    }

    // ── Request a reschedule ─────────────────────────────────────────────
    if (action === "reschedule") {
      const date = String(body.date || "");
      const startTime = String(body.startTime || "");
      const endTime = String(body.endTime || "");
      const reason = body.reason ? String(body.reason).trim() : null;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !startTime || !endTime) {
        return NextResponse.json({ error: "Please provide a valid new date, start time, and end time." }, { status: 400 });
      }
      if (endTime <= startTime) {
        return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
      }
      if (!["pending", "confirmed"].includes(booking.status)) {
        return NextResponse.json({ error: "This booking cannot be rescheduled." }, { status: 400 });
      }
      if (booking.rescheduleStatus === "requested") {
        return NextResponse.json({ error: "A reschedule request is already pending review." }, { status: 409 });
      }

      // 1. Policy: free rescheduling only when more than 7 days before event.
      const startDateStr = booking.startDate instanceof Date
        ? booking.startDate.toISOString().slice(0, 10)
        : String(booking.startDate).slice(0, 10);

      const eventDate = new Date(startDateStr + "T00:00:00");
      const daysUntil = Math.floor((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 7) {
        return NextResponse.json(
          { error: "Reschedules must be requested more than 7 days before the event. Please contact us directly on WhatsApp." },
          { status: 400 }
        );
      }

      // 2. Strict duration matching: user cannot extend duration beyond original booking.
      const origMins = parseMinutes(String(booking.endTime)) - parseMinutes(String(booking.startTime));
      const reqMins = parseMinutes(endTime) - parseMinutes(startTime);
      if (reqMins !== origMins) {
        return NextResponse.json(
          { error: `Requested slot duration (${reqMins / 60} hrs) must match original booking duration (${origMins / 60} hrs).` },
          { status: 400 }
        );
      }

      // 3. Venue opening hours check
      const [y, m, d] = date.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const hoursRows = await db
        .select()
        .from(venueHours)
        .where(eq(venueHours.dayOfWeek, dow))
        .limit(1);

      if (hoursRows.length > 0) {
        const vh = hoursRows[0];
        if (!vh.isOpen) {
          return NextResponse.json({ error: "The venue is closed on the selected date." }, { status: 400 });
        }
        const openStr = String(vh.openTime).slice(0, 5);
        const closeStr = String(vh.closeTime).slice(0, 5);
        if (startTime < openStr || endTime > closeStr) {
          return NextResponse.json({ error: `Selected time is outside venue hours (${openStr} – ${closeStr}).` }, { status: 400 });
        }
      }

      // 4. Overlap & availability check against existing bookings and blocked slots
      const existingBooked = await db
        .select({
          startTime: bookingDays.startTime,
          endTime: bookingDays.endTime,
        })
        .from(bookingDays)
        .innerJoin(bookings, eq(bookings.id, bookingDays.bookingId))
        .where(
          and(
            eq(bookingDays.dayDate, date as any),
            ne(bookings.id, booking.id),
            or(
              eq(bookings.status, "confirmed"),
              and(
                eq(bookings.status, "pending"),
                sql`${bookings.createdAt} > DATE_SUB(NOW(), INTERVAL 6 HOUR)`
              )
            )
          )
        );

      const existingBlocked = await db
        .select({
          startTime: blockedSlots.startTime,
          endTime: blockedSlots.endTime,
        })
        .from(blockedSlots)
        .where(eq(blockedSlots.slotDate, date as any));

      const isOverlap = [...existingBooked, ...existingBlocked].some((slot) => {
        const sStart = String(slot.startTime).slice(0, 5);
        const sEnd = String(slot.endTime).slice(0, 5);
        return startTime < sEnd && endTime > sStart;
      });

      if (isOverlap) {
        return NextResponse.json({ error: "The requested time slot conflicts with an existing booking or blocked hours." }, { status: 400 });
      }

      await db
        .update(bookings)
        .set({
          rescheduleStatus: "requested",
          rescheduleDate: date as any,
          rescheduleStartTime: startTime,
          rescheduleEndTime: endTime,
          rescheduleReason: reason,
          rescheduleRequestedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(bookings.reference, ref));

      // Fire-and-forget admin notification
      notifyAdminReschedule(booking as unknown as InvoiceBooking, { date, startTime, endTime, reason: reason || undefined })
        .catch((e: Error) => console.error("[reschedule] admin email failed:", e));

      return NextResponse.json({ success: true, message: "Reschedule request submitted for review." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[customer/bookings/:ref] POST error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
