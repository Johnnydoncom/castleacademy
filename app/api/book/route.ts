import { NextResponse, after } from 'next/server';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { bookings, bookingDays, venueHours, venueSettings, blockedSlots } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { createCheckoutOrder } from '@/lib/nomba';
import { generateBookingPdf, type InvoiceBooking } from '@/lib/invoice';
import { getCustomerSession } from '@/lib/customer-auth';
import { canonicalPricingInput, getOrCreateQuote } from '@/lib/pricing';
import { CANCELLATION_HTML } from '@/lib/policy';
import { MAX_DAYS, MAX_DURATION_HOURS, MAX_PARTICIPANTS, sortDays, timeToMinutes, type DaySchedule } from '@/lib/booking-schema';

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || "2349042222296";
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";


function safe(v: any) { return v == null ? "" : String(v).trim(); }
function formatExtras(v: any): string {
  if (!v) return "None";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "None";
  return String(v).trim() || "None";
}
function formatEventType(v: string) {
  const map: Record<string, string> = {
    training: "Corporate Training", workshop: "Workshop", seminar: "Seminar",
    meeting: "Team Meeting", coaching: "Coaching Session", other: "Other",
  };
  return map[v] || v || "—";
}
function row(label: string, value: string) {
  return "<tr><td style='padding:6px 0;font-size:13px;color:#888;width:40%;vertical-align:top;'>" + label + "</td>" +
    "<td style='padding:6px 0;font-size:13px;color:#222;font-weight:500;'>" + (value || "—") + "</td></tr>";
}
function stripHtml(html: string) { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

/** "Wed 5 Aug 2026" for a "YYYY-MM-DD" string. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
  return `${wd} ${d} ${mon} ${y}`;
}

/** One line per booked day — days may run different hours, so a single window won't do. */
function scheduleHtml(days: DaySchedule[]): string {
  return days
    .map((d) => `${formatDay(d.date)} &nbsp;·&nbsp; ${d.startTime} – ${d.endTime}`)
    .join("<br>");
}

function scheduleSummary(days: DaySchedule[]): string {
  if (days.length === 1) return `${formatDay(days[0].date)}, ${days[0].startTime}–${days[0].endTime}`;
  return `${days.length} days, ${formatDay(days[0].date)} – ${formatDay(days[days.length - 1].date)}`;
}

/** Generate a unique booking reference: CA-YYYYMMDD-XXXXXX */
function generateReference(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hex = randomBytes(3).toString("hex").toUpperCase();
  return `CA-${date}-${hex}`;
}

/** Check if Nomba is properly configured (real credentials, not placeholders) */
function isNombaConfigured(): boolean {
  const id = process.env.NOMBA_CLIENT_ID;
  return !!(id && id !== 'your-sandbox-client-id' && process.env.NOMBA_CLIENT_SECRET);
}

/** Turnaround required between two DIFFERENT bookings on the same day. */
async function getTurnaroundMinutes(): Promise<number> {
  try {
    const rows = await db
      .select({ value: venueSettings.value })
      .from(venueSettings)
      .where(eq(venueSettings.key, 'turnaround_minutes'));
    const n = Number(rows[0]?.value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Narrow the request's `days` payload, or null if it is not well-formed. */
function parseDays(raw: unknown): DaySchedule[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_DAYS) return null;
  const out: DaySchedule[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    const date = String(e.date ?? "");
    const startTime = String(e.startTime ?? "").slice(0, 5);
    const endTime = String(e.endTime ?? "").slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) return null;
    if (timeToMinutes(startTime) === null || timeToMinutes(endTime) === null) return null;
    seen.add(date);
    out.push({ date, startTime, endTime });
  }
  return sortDays(out);
}

/**
 * Server-side validation of a booking request.
 *
 * The client enforces all of this too, but client validation is UX — this is the
 * security boundary. Each day is checked against its OWN weekday opening hours,
 * which the previous single-window model could only approximate.
 *
 * Returns a customer-facing message, or `null` if the request is acceptable.
 */
async function validateBooking(
  d: { fullName?: string; phone?: string; email?: string; participants?: unknown; agreedToPolicy?: unknown },
  days: DaySchedule[]
): Promise<string | null> {
  if (!d.fullName || String(d.fullName).trim().length < 2) return "Please provide your full name.";
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) return "Please provide a valid email address.";
  if (!/^(?:\+?234|0)[7-9][01]\d{8}$/.test(String(d.phone ?? "").replace(/[\s\-()]/g, ""))) {
    return "Please provide a valid Nigerian phone number.";
  }
  if (d.agreedToPolicy !== true) return "You must accept the cancellation policy.";

  const participants = Number(d.participants);
  if (!Number.isInteger(participants) || participants < 1 || participants > MAX_PARTICIPANTS) {
    return `Participants must be a whole number between 1 and ${MAX_PARTICIPANTS}.`;
  }

  // Africa/Lagos is UTC+1 with no DST.
  const lagosNow = new Date(Date.now() + 3_600_000);
  const today = lagosNow.toISOString().slice(0, 10);

  const hours = await db
    .select({
      dayOfWeek: venueHours.dayOfWeek,
      isOpen: venueHours.isOpen,
      openTime: venueHours.openTime,
      closeTime: venueHours.closeTime,
    })
    .from(venueHours);
  const byDow = new Map(hours.map((h) => [Number(h.dayOfWeek), h]));

  for (const day of days) {
    if (day.date < today) return `${day.date} has already passed. Please pick another date.`;

    const start = timeToMinutes(day.startTime)!;
    const end = timeToMinutes(day.endTime)!;
    if (end <= start) return `On ${day.date}, the end time must be after the start time.`;
    if (end - start < 60) return `On ${day.date}, bookings run for at least one hour.`;
    if (end - start > MAX_DURATION_HOURS * 60) {
      return `On ${day.date}, single days are limited to ${MAX_DURATION_HOURS} hours.`;
    }

    const [y, m, dd] = day.date.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
    const vhRow = byDow.get(dow);
    if (!vhRow || !vhRow.isOpen) return `We're closed on ${day.date}. Please adjust your dates.`;

    const open = timeToMinutes(String(vhRow.openTime).slice(0, 5));
    const close = timeToMinutes(String(vhRow.closeTime).slice(0, 5));
    if (open !== null && close !== null && (start < open || end > close)) {
      return `On ${day.date} we're open ${String(vhRow.openTime).slice(0, 5)}–${String(vhRow.closeTime).slice(0, 5)}. Please choose times inside that window.`;
    }
  }

  return null;
}

/**
 * Any requested day that clashes with an existing booking (plus turnaround) or
 * an admin-blocked slot. Blocked slots use exact overlap — they represent the
 * room being unavailable rather than another session needing a reset after it.
 */
async function findConflict(
  days: DaySchedule[],
  turnaround: number
): Promise<string | null> {
  // MySQL has no unnest() — run one query per day and stop at first conflict.
  for (const day of days) {
    const s = timeToMinutes(day.startTime)!;
    const e = timeToMinutes(day.endTime)!;

    const booked = await db
      .select({
        start_time: bookingDays.startTime,
        end_time: bookingDays.endTime,
      })
      .from(bookingDays)
      .innerJoin(bookings, eq(bookings.id, bookingDays.bookingId))
      .where(
        and(
          eq(bookingDays.dayDate, day.date as any),
          sql`TIME_TO_SEC(${bookingDays.startTime}) / 60 < ${e + turnaround}`,
          sql`TIME_TO_SEC(${bookingDays.endTime}) / 60 > ${s - turnaround}`,
          or(
            eq(bookings.status, 'confirmed'),
            and(
              eq(bookings.status, 'pending'),
              sql`${bookings.createdAt} > DATE_SUB(NOW(), INTERVAL 6 HOUR)`
            )
          )
        )
      )
      .limit(1);

    if (booked.length > 0) {
      const b = booked[0];
      const gap = turnaround > 0 ? ` (we need ${turnaround} minutes between bookings)` : "";
      return `${String(b.start_time).slice(0, 5)}–${String(b.end_time).slice(0, 5)} on ${day.date} is already taken${gap}. Please choose another time.`;
    }

    const blocked = await db
      .select({
        start_time: blockedSlots.startTime,
        end_time: blockedSlots.endTime,
      })
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.slotDate, day.date as any),
          sql`TIME_TO_SEC(${blockedSlots.startTime}) / 60 < ${e}`,
          sql`TIME_TO_SEC(${blockedSlots.endTime}) / 60 > ${s}`
        )
      )
      .limit(1);

    if (blocked.length > 0) {
      const b = blocked[0];
      return `${String(b.start_time).slice(0, 5)}–${String(b.end_time).slice(0, 5)} on ${day.date} is unavailable. Please choose another time.`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const { fullName, organisation, phone, email, eventType, participants, extras, agreedToPolicy } = data;

    // ── 0. Parse and validate the day schedule ─────────────────────────────
    const days = parseDays(data.days);
    if (!days) {
      return NextResponse.json(
        { success: false, error: "validation", message: "Please choose at least one date with valid times." },
        { status: 400 }
      );
    }

    const validationError = await validateBooking(data, days);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: "validation", message: validationError },
        { status: 400 }
      );
    }

    // Summary columns kept on `bookings` so every existing read path (admin,
    // dashboard, emails, invoices, webhook, portal) keeps working unchanged.
    // booking_days is the source of truth for scheduling.
    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;
    const startTime = days.reduce((a, d) => (d.startTime < a ? d.startTime : a), "23:59");
    const endTime = days.reduce((a, d) => (d.endTime > a ? d.endTime : a), "00:00");
    data.days = days;

    // ── 1. Synchronous conflict check, per day, including turnaround ───────
    const turnaround = await getTurnaroundMinutes();
    const conflict = await findConflict(days, turnaround);
    if (conflict) {
      return NextResponse.json(
        { success: false, error: "slot_conflict", message: conflict },
        { status: 409 }
      );
    }

    // ── 2. Generate unique booking reference ───────────────────────────────
    let reference = generateReference();
    // Retry up to 3 times if (unlikely) collision
    for (let i = 0; i < 3; i++) {
      const existing = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.reference, reference))
        .limit(1);
      if (existing.length === 0) break;
      reference = generateReference();
    }

    // ── 3. Insert booking + its days (status = pending) ────────────────────
    // Let MySQL autoincrement the id and retrieve it for the booking_days FK.
    const [insertResult] = await db.insert(bookings).values({
      reference,
      fullName,
      organisation: organisation ?? null,
      phone,
      email,
      eventType,
      startDate: startDate as any,
      endDate: endDate as any,
      startTime,
      endTime,
      participants: Number(participants),
      extras: extras ?? [],
      agreedToPolicy: agreedToPolicy === true ? 1 : 0,
      status: 'pending',
    });
    const bookingId = Number(insertResult.insertId);

    for (const day of days) {
      await db.insert(bookingDays).values({
        bookingId,
        dayDate: day.date as any,
        startTime: day.startTime,
        endTime: day.endTime,
      });
    }

    data.bookingRef = reference;

    // Link this booking to a signed-in customer account, if any.
    try {
      const customerSession = await getCustomerSession();
      if (customerSession) {
        await db
          .update(bookings)
          .set({ customerId: Number(customerSession.id) })
          .where(eq(bookings.reference, reference));
      }
    } catch { /* guest booking — ignore */ }

    // ── 4. Pricing ─────────────────────────────────────────────────────────
    // Priced through the shared engine, keyed by a content hash of the booking
    // details. The customer was quoted from the very same function via
    // /api/quote moments ago, so this is almost always a cache hit — which is
    // both why the quoted price always equals the charged price, and why the
    // multi-second model call no longer sits in the submit path.
    const pricingInput = canonicalPricingInput(data);
    if (!pricingInput) {
      return NextResponse.json(
        { success: false, error: "validation", message: "We couldn't price this booking. Please check the dates and times." },
        { status: 400 }
      );
    }

    const quote = await getOrCreateQuote(pricingInput);

    const subtotal = quote.subtotal;
    const vatAmount = quote.vatAmount;
    const vatTotal = quote.total;
    const invoiceBreakdown = quote.breakdown;
    const discountApplied = quote.discountApplied;

    if (subtotal <= 0) {
      return NextResponse.json({ success: false, error: "Failed to calculate pricing for this booking. Please contact support." }, { status: 400 });
    }

    console.log(`[API] Priced ${reference} via ${quote.source}: subtotal=₦${subtotal}, total=₦${vatTotal}, discount=${discountApplied}`);

    data.invoiceSubtotal = subtotal;
    data.invoiceVatRate = quote.vatRate;
    data.invoiceVatAmount = vatAmount;
    data.invoiceTotal = vatTotal;
    data.invoiceBreakdown = invoiceBreakdown;
    data.discountApplied = discountApplied;

    // Update booking row with invoice figures
    await db
      .update(bookings)
      .set({
        invoiceSubtotal: subtotal,
        invoiceVat: vatAmount,
        invoiceTotal: vatTotal,
        discountApplied: discountApplied || null,
        invoiceBreakdown: invoiceBreakdown || null,
        quoteId: quote.quoteId,
        updatedAt: sql`NOW()`,
      })
      .where(eq(bookings.reference, reference));

    // ── 5. Create Nomba checkout order (synchronous) ───────────────────────
    // This ensures checkoutLink is returned to the customer immediately.
    let checkoutLink: string | null = null;

    if (vatTotal > 0 && isNombaConfigured()) {
      try {
        const nombaOrder = await createCheckoutOrder({
          orderReference: reference,
          amount: vatTotal,
          customerEmail: email,
          // Customer is redirected here after completing payment on Nomba
          callbackUrl: `${APP_URL}/booking/callback?ref=${reference}`,
        });

        await db
          .update(bookings)
          .set({
            nombaOrderRef: nombaOrder.orderReference,
            checkoutLink: nombaOrder.checkoutLink,
            updatedAt: sql`NOW()`,
          })
          .where(eq(bookings.reference, reference));

        checkoutLink = nombaOrder.checkoutLink;
        data.checkoutLink = checkoutLink;

        console.log(`[API] Nomba checkout created for ${reference}: ${checkoutLink}`);
      } catch (nombaErr) {
        // Fatal if payment cannot be setup for a priced booking
        console.error('[API] Nomba checkout creation failed:', nombaErr);
        return NextResponse.json({ success: false, error: 'Payment gateway error. Please try again later.' }, { status: 502 });
      }
    } else if (vatTotal > 0 && !isNombaConfigured()) {
       console.error('[API] Nomba is not configured but booking requires payment.');
       return NextResponse.json({ success: false, error: 'Payment gateway not configured. Please contact support.' }, { status: 500 });
    }

    // ── 6. Background: emails + GAS logging ───────────────────────────────
    after(async () => {
      try {
        // Send emails
        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
          console.warn("[API] SMTP credentials not configured. Skipping emails.");
        } else {
          const smtpOptions: any = {
            auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
          };
          if (process.env.SMTP_HOST) {
            smtpOptions.host = process.env.SMTP_HOST;
            smtpOptions.port = Number(process.env.SMTP_PORT) || 465;
            smtpOptions.secure = process.env.SMTP_SECURE === 'false' ? false : true;
          } else {
            smtpOptions.service = 'gmail';
          }
          const transporter = nodemailer.createTransport(smtpOptions);
          const dateLabel = scheduleSummary(days);

          // ── Admin email ──────────────────────────────────────────────────
          const adminHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
            <table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
            <tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
            <img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;' />
            <p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>New Booking Request</p>
            </td></tr>
            <tr><td style='background:#c9a84c;padding:12px 32px;'>
            <p style='margin:0;color:#0d0d0d;font-size:14px;font-weight:600;'>Ref: ${reference} &nbsp;|&nbsp; ${dateLabel} &nbsp;|&nbsp; ${participants} attendees</p>
            </td></tr>
            <tr><td style='padding:28px 32px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
            ${row("Booking Ref", `<strong>${reference}</strong>`)}
            ${row("Full Name", fullName)}
            ${row("Organisation", organisation || "—")}
            ${row("Phone", phone)}
            ${row("Email", email)}
            ${row("Event Type", formatEventType(eventType))}
            ${row("Schedule", scheduleHtml(days))}
            ${row("Participants", String(participants))}
            ${row("Optional Extras", formatExtras(extras))}
            ${subtotal ? row("Subtotal (ex. VAT)", "₦" + subtotal.toLocaleString()) : ""}
            ${discountApplied ? row("Discount Applied", discountApplied) : ""}
            ${vatAmount ? row(`VAT (${quote.vatRate}%)`, "₦" + vatAmount.toLocaleString()) : ""}
            ${vatTotal ? row("Total Payable (inc. VAT)", "<strong>₦" + vatTotal.toLocaleString() + "</strong>") : ""}
            ${invoiceBreakdown ? row("Pricing Breakdown", invoiceBreakdown) : ""}
            ${checkoutLink ? row("Checkout Link", `<a href='${checkoutLink}' style='color:#c9a84c;'>View Payment Link</a>`) : ""}
            </table></td></tr>
            <tr><td style='background:#f5f3ee;padding:16px 32px;border-top:1px solid #e0e0e0;'>
            <p style='margin:0;font-size:11px;color:#999;text-align:center;'>Automated notification from the ${VENUE_NAME} booking form. Status: PENDING — payment link ${checkoutLink ? 'sent to customer' : 'not generated (check Nomba config)'}.</p>
            </td></tr>
            </table></td></tr></table></body></html>`;

          await transporter.sendMail({
            from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
            to: NOTIFICATION_EMAIL,
            subject: `[${VENUE_NAME}] New Booking — ${safe(fullName)} · ${safe(startDate)} · Ref: ${reference}`,
            text: stripHtml(adminHtml),
            html: adminHtml
          });

          // ── Customer email ───────────────────────────────────────────────
          if (email) {
            const firstName = (fullName || "there").split(" ")[0];
            const waNumber = SUPPORT_WHATSAPP.replace(/\D/g, "");
            const year = new Date().getFullYear();

            const paymentSection = checkoutLink
              ? `<div style='background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin-bottom:20px;'>
                  <p style='margin:0 0 8px;font-size:14px;font-weight:700;color:#166534;'>💳 Complete your payment to secure your slot</p>
                  <p style='margin:0 0 4px;font-size:13px;color:#166534;'>Amount due: <strong>₦${vatTotal.toLocaleString()}</strong> (inc. VAT)</p>
                  <p style='margin:0 0 16px;font-size:12px;color:#15803d;'>Your slot is soft-reserved for 6 hours. Please pay before then to confirm your booking.</p>
                  <a href='${checkoutLink}' style='display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:600;text-decoration:none;'>Pay Now — ₦${vatTotal.toLocaleString()} →</a>
                </div>`
              : `<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Once we confirm availability, we'll send you payment instructions to your email shortly. You can also reach us directly on WhatsApp.</p>`;

            const customerHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
              <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
              <table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
              <tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
              <img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;' />
              <p style='margin:6px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos</p>
              </td></tr>
              <tr><td style='padding:32px;'>
              <h2 style='margin:0 0 8px;color:#0d0d0d;font-size:20px;'>Hi ${firstName}, your booking request is in!</h2>
              <p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Thank you for choosing ${VENUE_NAME}. Here's a summary of your request:</p>
              <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;border-radius:8px;margin-bottom:24px;'><tr><td style='padding:20px;'>
              <p style='margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0d0d0d;'>Your booking summary &amp; reference</p>
              <table width='100%' cellpadding='0' cellspacing='0'>
              ${row("Booking Reference", `<strong style='color:#0d0d0d;font-size:15px;letter-spacing:.05em;'>${reference}</strong>`)}
              ${row("Schedule", scheduleHtml(days))}
              ${row("Event type", formatEventType(eventType))}
              ${row("Participants", String(participants))}
              ${subtotal ? row("Subtotal (ex. VAT)", "₦" + subtotal.toLocaleString()) : ""}
              ${discountApplied ? row("Discount Applied", discountApplied) : ""}
              ${vatAmount ? row(`VAT (${quote.vatRate}%)`, "₦" + vatAmount.toLocaleString()) : ""}
              ${vatTotal ? row("Total Payable (inc. VAT)", "<strong>₦" + vatTotal.toLocaleString() + "</strong>") : ""}
              ${invoiceBreakdown ? row("Pricing Breakdown", invoiceBreakdown) : ""}
              ${extras?.length ? row("Optional Extras", formatExtras(extras)) : ""}
              </table></td></tr></table>
              ${paymentSection}
              ${CANCELLATION_HTML}
              <p style='margin:16px 0 8px;color:#444;font-size:14px;'>Need help? Chat with us on WhatsApp:</p>
              <a href='https://wa.me/${waNumber}' style='display:inline-block;background:#25d366;color:#fff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:24px;'>Chat on WhatsApp</a>
              <p style='margin:20px 0 0;color:#888;font-size:12px;line-height:1.6;'>If you didn't submit this booking request, please ignore this email.<br>Reply to <a href='mailto:${NOTIFICATION_EMAIL}' style='color:#c9a84c;'>${NOTIFICATION_EMAIL}</a> if you have any concerns.</p>
              </td></tr>
              <tr><td style='background:#0d0d0d;padding:20px 32px;text-align:center;'>
              <p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© ${year} ${VENUE_NAME} · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>
              </td></tr>
              </table></td></tr></table></body></html>`;

            // Attach a pro-forma invoice PDF for the customer.
            let invoiceAttachment: { filename: string; content: Buffer }[] = [];
            try {
              const invoiceBooking: InvoiceBooking = {
                reference,
                full_name: fullName,
                organisation: organisation ?? null,
                email,
                phone,
                event_type: eventType,
                start_date: startDate,
                end_date: endDate,
                start_time: startTime,
                end_time: endTime,
                days: days.map((d) => ({ date: d.date, start_time: d.startTime, end_time: d.endTime })),
                participants: Number(participants),
                extras: Array.isArray(extras) ? extras : null,
                invoice_subtotal: subtotal,
                invoice_vat: vatAmount,
                invoice_total: vatTotal,
                discount_applied: discountApplied,
                invoice_breakdown: invoiceBreakdown,
                status: "pending",
                payment_status: "unpaid",
                invoice_number: null,
                payment_method: null,
              };
              const pdf = await generateBookingPdf(invoiceBooking, "invoice");
              invoiceAttachment = [{ filename: `Invoice-${reference}.pdf`, content: pdf }];
            } catch (pdfErr) {
              console.error("[API] Invoice PDF generation failed:", pdfErr);
            }

            await transporter.sendMail({
              from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
              to: email,
              replyTo: NOTIFICATION_EMAIL,
              subject: `Your ${VENUE_NAME} booking request — Ref: ${reference}`,
              text: stripHtml(customerHtml),
              html: customerHtml,
              attachments: invoiceAttachment,
            });
          }
        }

        // Forward to Google Apps Script for spreadsheet logging
        if (process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL) {
          await fetch(process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(data),
          }).catch(err => console.error("GAS logging failed:", err));
        }
      } catch (err) {
        console.error('[API] Background task failed:', err);
      }
    });

    // ── 7. Return response with checkout link ──────────────────────────────
    return NextResponse.json({
      success: true,
      reference,
      message: "Booking accepted",
      // Returned synchronously so the frontend can show Pay Now immediately
      checkoutLink,
      amount: vatTotal > 0 ? vatTotal : null,
      // Lets the client assert that what it quoted is what it charged.
      quoteId: quote.quoteId,
    });
  } catch (error) {
    console.error('[API] Request processing failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to accept booking' }, { status: 500 });
  }
}
