import { NextResponse, after } from 'next/server';
import Groq from 'groq-sdk';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { createCheckoutOrder } from '@/lib/nomba';
import { generateBookingPdf, type InvoiceBooking } from '@/lib/invoice';
import { getCustomerSession } from '@/lib/customer-auth';

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || "2349042222296";
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";
const VAT_RATE = parseFloat(process.env.VAT_RATE || "7.5");


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

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      fullName, organisation, phone, email, eventType,
      startDate, endDate, startTime, endTime,
      participants, extras, agreedToPolicy
    } = data;

    // ── 1. Synchronous conflict check ──────────────────────────────────────
    // A slot is busy if:
    //   - CONFIRMED booking overlaps, OR
    //   - PENDING booking submitted within last 6 hours overlaps
    const conflicts = await sql`
      SELECT 1 FROM bookings
      WHERE (
        status = 'confirmed'
        OR (status = 'pending' AND created_at > NOW() - INTERVAL '6 hours')
      )
      AND start_date <= ${endDate}::date
      AND end_date   >= ${startDate}::date
      AND start_time <  ${endTime}::time
      AND end_time   >  ${startTime}::time
      LIMIT 1
    `;

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "slot_conflict",
          message: "This time slot is no longer available. Please choose a different time."
        },
        { status: 409 }
      );
    }

    // ── 2. Generate unique booking reference ───────────────────────────────
    let reference = generateReference();
    // Retry up to 3 times if (unlikely) collision
    for (let i = 0; i < 3; i++) {
      const existing = await sql`SELECT 1 FROM bookings WHERE reference = ${reference} LIMIT 1`;
      if (existing.length === 0) break;
      reference = generateReference();
    }

    // ── 3. Insert booking into database (status = pending) ─────────────────
    await sql`
      INSERT INTO bookings (
        reference, full_name, organisation, phone, email,
        event_type, start_date, end_date, start_time, end_time,
        participants, extras, agreed_to_policy, status
      ) VALUES (
        ${reference},
        ${fullName},
        ${organisation ?? null},
        ${phone},
        ${email},
        ${eventType},
        ${startDate}::date,
        ${endDate}::date,
        ${startTime}::time,
        ${endTime}::time,
        ${Number(participants)},
        ${extras ?? []},
        ${agreedToPolicy === true},
        'pending'
      )
    `;

    data.bookingRef = reference;

    // Link this booking to a signed-in customer account, if any.
    try {
      const customerSession = await getCustomerSession();
      if (customerSession) {
        await sql`UPDATE bookings SET customer_id = ${customerSession.id}::uuid WHERE reference = ${reference}`;
      }
    } catch { /* guest booking — ignore */ }

    // ── 4. Pricing Calculation ─────────────────────────────────────────────
    let subtotal = 0;
    let vatAmount = 0;
    let vatTotal = 0;
    let invoiceBreakdown = "";
    let discountApplied = "";

    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing GROQ_API_KEY environment variable.");
      }

      const pricingRulesPath = path.join(process.cwd(), 'pricing-rules.txt');
      const pricingRules = await fs.readFile(pricingRulesPath, 'utf-8');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const prompt = `You are an automated pricing engine for Castle Academy, a training venue in Lagos, Nigeria.
Here are the pricing rules:
${pricingRules}

Calculate the pre-VAT subtotal price for this booking:
${JSON.stringify({
  startDate, endDate, startTime, endTime,
  participants: Number(participants),
  eventType, extras
}, null, 2)}

Respond ONLY with valid JSON matching this schema exactly:
{
  "totalPrice": <integer, pre-VAT subtotal in Naira>,
  "discountApplied": "<name of discount or 'None'>",
  "breakdown": "<one-line explanation of the calculation>"
}`;

      const aiRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      const invoice = JSON.parse(aiRes.choices[0].message.content || '{}');
      subtotal = Number(invoice.totalPrice) || 0;
      invoiceBreakdown = invoice.breakdown || '';
      discountApplied = invoice.discountApplied || '';

      console.log(`[API] Groq pricing: subtotal=₦${subtotal}, discount=${discountApplied}`);
    } catch (priceErr) {
      console.warn('[API] AI pricing failed, using fallback algorithmic calculation:', (priceErr as Error).message);

      // ── Fallback: deterministic algorithm from pricing-rules.txt ──────────
      const start = new Date(`1970-01-01T${startTime}`);
      const end = new Date(`1970-01-01T${endTime}`);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (hours <= 0) hours += 24;

      const startDay = new Date(startDate);
      const endDay = new Date(endDate);
      const days = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let pricePerDay = 0;
      if (hours <= 3) {
        pricePerDay = 100000;
        invoiceBreakdown = `3 Hours Package (₦100,000) × ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours <= 4) {
        pricePerDay = 120000;
        invoiceBreakdown = `4 Hours / Half Day (₦120,000) × ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours <= 8) {
        pricePerDay = 180000;
        invoiceBreakdown = `Full Day / 8 Hours (₦180,000) × ${days} day${days > 1 ? 's' : ''}`;
      } else {
        const extraHours = Math.ceil(hours - 8);
        pricePerDay = 180000 + extraHours * 30000;
        invoiceBreakdown = `Full Day + ${extraHours} Extra Hour${extraHours > 1 ? 's' : ''} (₦${pricePerDay.toLocaleString()}) × ${days} day${days > 1 ? 's' : ''}`;
      }

      subtotal = pricePerDay * days;
      discountApplied = 'None (Fallback Calculation)';
    }

    if (subtotal <= 0) {
      return NextResponse.json({ success: false, error: "Failed to calculate pricing for this booking. Please contact support." }, { status: 400 });
    }

    vatAmount = Math.round(subtotal * VAT_RATE / 100);
    vatTotal = subtotal + vatAmount;

    data.invoiceSubtotal = subtotal;
    data.invoiceVatRate = VAT_RATE;
    data.invoiceVatAmount = vatAmount;
    data.invoiceTotal = vatTotal;
    data.invoiceBreakdown = invoiceBreakdown;
    data.discountApplied = discountApplied;

    // Update booking row with invoice figures
    await sql`
      UPDATE bookings SET
        invoice_subtotal  = ${subtotal},
        invoice_vat       = ${vatAmount},
        invoice_total     = ${vatTotal},
        discount_applied  = ${discountApplied || null},
        invoice_breakdown = ${invoiceBreakdown || null},
        updated_at        = NOW()
      WHERE reference = ${reference}
    `;

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

        await sql`
          UPDATE bookings SET
            nomba_order_ref = ${nombaOrder.orderReference},
            checkout_link   = ${nombaOrder.checkoutLink},
            updated_at      = NOW()
          WHERE reference = ${reference}
        `;

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
          const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`;

          // ── Admin email ──────────────────────────────────────────────────
          const adminHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
            <table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
            <tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
            <img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;' />
            <p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>New Booking Request</p>
            </td></tr>
            <tr><td style='background:#c9a84c;padding:12px 32px;'>
            <p style='margin:0;color:#0d0d0d;font-size:14px;font-weight:600;'>Ref: ${reference} &nbsp;|&nbsp; ${dateLabel} &nbsp;|&nbsp; ${startTime} – ${endTime} &nbsp;|&nbsp; ${participants} attendees</p>
            </td></tr>
            <tr><td style='padding:28px 32px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
            ${row("Booking Ref", `<strong>${reference}</strong>`)}
            ${row("Full Name", fullName)}
            ${row("Organisation", organisation || "—")}
            ${row("Phone", phone)}
            ${row("Email", email)}
            ${row("Event Type", formatEventType(eventType))}
            ${row("Start Date", startDate)}
            ${row("End Date", endDate)}
            ${row("Start Time", startTime)}
            ${row("End Time", endTime)}
            ${row("Participants", String(participants))}
            ${row("Optional Extras", formatExtras(extras))}
            ${subtotal ? row("Subtotal (ex. VAT)", "₦" + subtotal.toLocaleString()) : ""}
            ${discountApplied ? row("Discount Applied", discountApplied) : ""}
            ${vatAmount ? row(`VAT (${VAT_RATE}%)`, "₦" + vatAmount.toLocaleString()) : ""}
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
              ${row("Date(s)", dateLabel)}
              ${row("Time", `${startTime} – ${endTime}`)}
              ${row("Event type", formatEventType(eventType))}
              ${row("Participants", String(participants))}
              ${subtotal ? row("Subtotal (ex. VAT)", "₦" + subtotal.toLocaleString()) : ""}
              ${discountApplied ? row("Discount Applied", discountApplied) : ""}
              ${vatAmount ? row(`VAT (${VAT_RATE}%)`, "₦" + vatAmount.toLocaleString()) : ""}
              ${vatTotal ? row("Total Payable (inc. VAT)", "<strong>₦" + vatTotal.toLocaleString() + "</strong>") : ""}
              ${invoiceBreakdown ? row("Pricing Breakdown", invoiceBreakdown) : ""}
              ${extras?.length ? row("Optional Extras", formatExtras(extras)) : ""}
              </table></td></tr></table>
              ${paymentSection}
              <p style='margin:0 0 8px;color:#b45309;font-size:13px;font-weight:600;'>⚠️ Cancellation Policy: Once confirmed, bookings cannot be cancelled or refunded.</p>
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
                participants: Number(participants),
                extras: Array.isArray(extras) ? extras : null,
                invoice_subtotal: subtotal,
                invoice_vat: vatAmount,
                invoice_total: vatTotal,
                discount_applied: discountApplied,
                invoice_breakdown: invoiceBreakdown,
                status: "pending",
                payment_status: "unpaid",
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
    });
  } catch (error) {
    console.error('[API] Request processing failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to accept booking' }, { status: 500 });
  }
}
