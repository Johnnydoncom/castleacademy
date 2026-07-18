import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/nomba";
import nodemailer from "nodemailer";

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";
const WEBHOOK_SECRET = process.env.NOMBA_WEBHOOK_SECRET || "";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function createMailTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return null;
  const smtpOptions: any = {
    auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
  };
  if (process.env.SMTP_HOST) {
    smtpOptions.host = process.env.SMTP_HOST;
    smtpOptions.port = Number(process.env.SMTP_PORT) || 465;
    smtpOptions.secure = process.env.SMTP_SECURE === "false" ? false : true;
  } else {
    smtpOptions.service = "gmail";
  }
  return nodemailer.createTransport(smtpOptions);
}

/**
 * POST /api/webhooks/nomba
 * Receives payment_success, payment_failed, and payment_reversed events from Nomba.
 * Verifies the HMAC signature, then verifies the transaction server-side before
 * updating the booking status.
 *
 * ─── Setup Instructions ────────────────────────────────────────────────────
 * Register this URL in Nomba Dashboard → Developer → Webhook Setup:
 *   Production: https://thecastleacademy.com/api/webhooks/nomba
 * Subscribe to: payment_success, payment_failed, payment_reversed events.
 * Copy the signature key into NOMBA_WEBHOOK_SECRET in your environment.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    const nombaSignature = req.headers.get("nomba-signature") || req.headers.get("nomba-sig-value") || "";
    const nombaTimestamp = req.headers.get("nomba-timestamp") || "";

    // 1. Verify HMAC signature (skip if no secret configured — log warning)
    if (WEBHOOK_SECRET) {
      const valid = verifyWebhookSignature(rawBody, WEBHOOK_SECRET, nombaSignature, nombaTimestamp, payload);
      if (!valid) {
        console.warn("[webhooks/nomba] Signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("[webhooks/nomba] NOMBA_WEBHOOK_SECRET not set — skipping signature verification");
    }

    // 2. Only process payment lifecycle events
    const HANDLED_EVENTS = ["payment_success", "payment_failed", "payment_reversed"];
    if (!HANDLED_EVENTS.includes(payload.event_type)) {
      console.log(`[webhooks/nomba] Ignoring event: ${payload.event_type}`);
      return NextResponse.json({ received: true });
    }

    const isSuccess = payload.event_type === "payment_success";
    const isFailed = payload.event_type === "payment_failed";
    const isReversed = payload.event_type === "payment_reversed";

    // 3. Extract the order reference (our booking reference)
    // Nomba can include orderReference in different locations depending on payment method
    const orderReference =
      payload.data?.order?.orderReference ||
      payload.data?.transaction?.merchantTxRef ||
      null;

    // Extract transaction ID (used for precise server-side verification)
    const transactionId = payload.data?.transaction?.transactionId || null;

    // Detect payment method from webhook payload
    const paymentMethod =
      payload.data?.order?.paymentMethod === "bank_transfer"
        ? "bank_transfer"
        : "card";

    if (!orderReference) {
      console.error("[webhooks/nomba] No orderReference in payload", JSON.stringify(payload));
      return NextResponse.json({ error: "No orderReference" }, { status: 400 });
    }

    console.log(`[webhooks/nomba] ${payload.event_type} for orderRef: ${orderReference}, txId: ${transactionId}`);

    // 4. Look up the booking by nomba_order_ref (primary lookup)
    let rows = await sql`
      SELECT id, reference, email, full_name, start_date::text, end_date::text,
             start_time::text, end_time::text, status, payment_status, invoice_total
      FROM bookings
      WHERE nomba_order_ref = ${orderReference}
      LIMIT 1
    `;

    // Fallback: match by booking reference directly (orderReference === CA-YYYYMMDD-XXXXXX)
    if (rows.length === 0) {
      rows = await sql`
        SELECT id, reference, email, full_name, start_date::text, end_date::text,
               start_time::text, end_time::text, status, payment_status, invoice_total
        FROM bookings
        WHERE reference = ${orderReference}
        LIMIT 1
      `;
    }

    if (rows.length === 0) {
      console.error("[webhooks/nomba] Booking not found for orderRef:", orderReference);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rows[0];

    // 5. Idempotency guard — skip if already confirmed/paid (only for success events)
    if (isSuccess && booking.payment_status === "paid" && booking.status === "confirmed") {
      console.log(`[webhooks/nomba] Booking ${booking.reference} already confirmed — ignoring duplicate`);
      return NextResponse.json({ received: true, message: "Already confirmed" });
    }

    // ── Handle payment_failed / payment_reversed ─────────────────────────────
    if (isFailed || isReversed) {
      const newPaymentStatus = isReversed ? "reversed" : "failed";
      const newStatus = "pending"; // revert to pending so admin can follow up

      await sql`
        UPDATE bookings SET
          status               = ${newStatus},
          payment_status       = ${newPaymentStatus},
          nomba_transaction_id = ${transactionId},
          updated_at           = NOW()
        WHERE id = ${booking.id}::uuid
      `;

      console.log(`[webhooks/nomba] ⚠️ Booking ${booking.reference} payment ${newPaymentStatus}`);

      // Notify admin so they can follow up with the customer
      const transporter = createMailTransporter();
      if (transporter) {
        const year = new Date().getFullYear();
        const dateLabel =
          booking.start_date === booking.end_date
            ? booking.start_date
            : `${booking.start_date} → ${booking.end_date}`;
        const eventLabel = isReversed ? "Payment Reversed" : "Payment Failed";
        const eventEmoji = isReversed ? "↩️" : "❌";
        const bgColour = isReversed ? "#7c3aed" : "#dc2626";

        const adminFailHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
<img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;'/>
<p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>${eventLabel}</p>
</td></tr>
<tr><td style='background:${bgColour};padding:12px 32px;'>
<p style='margin:0;color:#fff;font-size:14px;font-weight:600;'>${eventEmoji} Booking ${booking.reference} — ${eventLabel}</p>
</td></tr>
<tr><td style='padding:28px 32px;'>
<table width='100%' cellpadding='0' cellspacing='0'>
<tr><td style='padding:5px 0;font-size:13px;color:#888;width:40%;'>Booking Ref</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:700;font-family:monospace;'>${booking.reference}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Customer</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${booking.full_name} &lt;${booking.email}&gt;</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Date(s)</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${dateLabel}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Event Status</td><td style='padding:5px 0;font-size:13px;color:${bgColour};font-weight:700;'>${eventLabel}</td></tr>
${transactionId ? `<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Nomba Tx ID</td><td style='padding:5px 0;font-size:11px;color:#666;font-family:monospace;word-break:break-all;'>${transactionId}</td></tr>` : ""}
</table>
<p style='margin:20px 0 0;font-size:13px;color:#555;'>The booking slot remains pending. Please follow up with the customer to retry payment or cancel the reservation.</p>
</td></tr>
<tr><td style='background:#f5f3ee;padding:12px 32px;border-top:1px solid #e0e0e0;'>
<p style='margin:0;font-size:11px;color:#999;text-align:center;'>Automated via Nomba webhook · © ${year} ${VENUE_NAME}</p>
</td></tr>
</table></td></tr></table></body></html>`;

        try {
          await transporter.sendMail({
            from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
            to: NOTIFICATION_EMAIL,
            subject: `${eventEmoji} ${eventLabel}: ${booking.reference} — ${booking.full_name} · ${dateLabel}`,
            text: stripHtml(adminFailHtml),
            html: adminFailHtml,
          });
        } catch (emailErr) {
          console.error("[webhooks/nomba] Failed to send admin failure email:", emailErr);
        }

        // Also notify the customer so they can retry
        const firstName = (booking.full_name || "there").split(" ")[0];
        const customerRetryMsg = isReversed
          ? `Your payment for booking <strong>${booking.reference}</strong> has been reversed. Please contact your bank or try a different payment method.`
          : `Unfortunately, your payment for booking <strong>${booking.reference}</strong> was not successful. Please try again using a different card or bank transfer.`;

        const customerFailHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
<img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;'/>
<p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>${eventLabel}</p>
</td></tr>
<tr><td style='background:${bgColour};padding:12px 32px;'>
<p style='margin:0;color:#fff;font-size:14px;font-weight:600;'>${eventEmoji} Action Required — ${eventLabel}</p>
</td></tr>
<tr><td style='padding:32px;'>
<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:20px;'>Hi ${firstName},</h2>
<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>${customerRetryMsg}</p>
<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Your slot is still soft-reserved. Please <a href='${APP_URL}/#book' style='color:#c9a84c;font-weight:600;'>return to the booking page</a> and complete payment to secure your reservation.</p>
<p style='margin:0;color:#444;font-size:14px;'>If you need assistance, contact us at <a href='mailto:${NOTIFICATION_EMAIL}' style='color:#c9a84c;'>${NOTIFICATION_EMAIL}</a>.</p>
</td></tr>
<tr><td style='background:#0d0d0d;padding:20px 32px;text-align:center;'>
<p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© ${new Date().getFullYear()} ${VENUE_NAME} · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>
</td></tr>
</table></td></tr></table></body></html>`;

        try {
          await transporter.sendMail({
            from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
            to: booking.email,
            replyTo: NOTIFICATION_EMAIL,
            subject: `${eventEmoji} Payment ${isReversed ? "Reversed" : "Failed"} — ${VENUE_NAME} · Ref: ${booking.reference}`,
            text: stripHtml(customerFailHtml),
            html: customerFailHtml,
          });
        } catch (emailErr) {
          console.error("[webhooks/nomba] Failed to send customer failure email:", emailErr);
        }
      }

      return NextResponse.json({ received: true, updated: newPaymentStatus });
    }

    // ── Handle payment_success ───────────────────────────────────────────────
    // 6. Server-side transaction verification.
    // On sandbox, verification endpoints are unreliable — we trust the signed webhook.
    // On production with NOMBA_WEBHOOK_SECRET set, the HMAC already proves authenticity.
    const isSandbox = (process.env.NOMBA_BASE_URL || "").includes("sandbox");
    let verifiedPaymentMethod = paymentMethod;

    if (!isSandbox) {
      // Production: do a hard verify
      const verification = await verifyTransaction(orderReference, transactionId || undefined);
      if (!verification.success) {
        console.warn(`[webhooks/nomba] Transaction verification failed for ${orderReference}:`, verification.statusCode);
        return NextResponse.json({ error: "Payment verification failed" }, { status: 402 });
      }
      verifiedPaymentMethod = verification.paymentMethod || paymentMethod;
      console.log(`[webhooks/nomba] ✅ Server-side verification passed for ${orderReference}`);
    } else {
      // Sandbox: skip hard verify — trust the webhook payload (already HMAC-verified above)
      console.log(`[webhooks/nomba] ℹ️ Sandbox mode — skipping server-side transaction verification`);
      // Attempt soft-verify but don't abort on failure
      try {
        const verification = await verifyTransaction(orderReference, transactionId || undefined);
        if (verification.paymentMethod) verifiedPaymentMethod = verification.paymentMethod;
        console.log(`[webhooks/nomba] Soft verify result: ${verification.statusCode}`);
      } catch {
        console.log(`[webhooks/nomba] Soft verify threw (sandbox) — proceeding anyway`);
      }
    }

    // 7. Auto-confirm the booking
    await sql`
      UPDATE bookings SET
        status               = 'confirmed',
        payment_status       = 'paid',
        payment_method       = ${verifiedPaymentMethod},
        nomba_transaction_id = ${transactionId},
        paid_at              = NOW(),
        updated_at           = NOW()
      WHERE id = ${booking.id}::uuid
    `;

    console.log(`[webhooks/nomba] ✅ Booking ${booking.reference} auto-confirmed (${verifiedPaymentMethod})`);

    // 8. Send emails (customer confirmation + admin notification)
    const transporter = createMailTransporter();
    if (transporter) {
      const firstName = (booking.full_name || "there").split(" ")[0];
      const year = new Date().getFullYear();
      const dateLabel =
        booking.start_date === booking.end_date
          ? booking.start_date
          : `${booking.start_date} → ${booking.end_date}`;
      const amountStr = booking.invoice_total
        ? `₦${Number(booking.invoice_total).toLocaleString()}`
        : null;

      // ── Customer Confirmation Email ──────────────────────────────────────
      const customerHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
<img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;'/>
<p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>Payment Confirmed</p>
</td></tr>
<tr><td style='background:#16a34a;padding:12px 32px;'>
<p style='margin:0;color:#fff;font-size:14px;font-weight:600;'>✅ Your booking ${booking.reference} is confirmed!</p>
</td></tr>
<tr><td style='padding:32px;'>
<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:20px;'>Hi ${firstName}, your booking is confirmed!</h2>
<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>
  Great news! We've received your payment and your booking at <strong>${VENUE_NAME}</strong> is now confirmed.
</p>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;border-radius:8px;margin-bottom:24px;'><tr><td style='padding:20px;'>
<p style='margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0d0d0d;'>Booking Details</p>
<table width='100%' cellpadding='0' cellspacing='0'>
<tr><td style='padding:5px 0;font-size:13px;color:#888;width:40%;'>Booking Reference</td><td style='padding:5px 0;font-size:15px;font-weight:700;color:#0d0d0d;letter-spacing:.05em;font-family:monospace;'>${booking.reference}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Date(s)</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${dateLabel}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Time</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${booking.start_time?.slice(0, 5)} – ${booking.end_time?.slice(0, 5)}</td></tr>
${amountStr ? `<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Amount Paid</td><td style='padding:5px 0;font-size:13px;color:#16a34a;font-weight:700;'>${amountStr}</td></tr>` : ""}
</table>
</td></tr></table>
<div style='background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:20px;'>
<p style='margin:0;font-size:13px;color:#92400e;font-weight:600;'>⚠️ Non-Refundable: This booking cannot be cancelled or refunded.</p>
</div>
<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>
  If you have any questions, please don't hesitate to reach out to us at
  <a href='mailto:${NOTIFICATION_EMAIL}' style='color:#c9a84c;'>${NOTIFICATION_EMAIL}</a>.
</p>
</td></tr>
<tr><td style='background:#0d0d0d;padding:20px 32px;text-align:center;'>
<p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© ${year} ${VENUE_NAME} · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>
</td></tr>
</table></td></tr></table></body></html>`;

      try {
        await transporter.sendMail({
          from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
          to: booking.email,
          replyTo: NOTIFICATION_EMAIL,
          subject: `✅ Booking Confirmed — ${VENUE_NAME} · Ref: ${booking.reference}`,
          text: stripHtml(customerHtml),
          html: customerHtml,
        });
      } catch (emailErr) {
        console.error("[webhooks/nomba] Failed to send customer email:", emailErr);
      }

      // ── Admin Notification Email ─────────────────────────────────────────
      const adminHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
<img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;'/>
<p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>Payment Auto-Confirmed</p>
</td></tr>
<tr><td style='background:#16a34a;padding:12px 32px;'>
<p style='margin:0;color:#fff;font-size:14px;font-weight:600;'>💳 Booking ${booking.reference} has been automatically confirmed</p>
</td></tr>
<tr><td style='padding:28px 32px;'>
<table width='100%' cellpadding='0' cellspacing='0'>
<tr><td style='padding:5px 0;font-size:13px;color:#888;width:40%;'>Booking Ref</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:700;font-family:monospace;'>${booking.reference}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Customer</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${booking.full_name} &lt;${booking.email}&gt;</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Date(s)</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${dateLabel}</td></tr>
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Time</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${booking.start_time?.slice(0, 5)} – ${booking.end_time?.slice(0, 5)}</td></tr>
${amountStr ? `<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Amount Paid</td><td style='padding:5px 0;font-size:13px;color:#16a34a;font-weight:700;'>${amountStr}</td></tr>` : ""}
<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Payment Method</td><td style='padding:5px 0;font-size:13px;color:#222;font-weight:500;'>${verification.paymentMethod || paymentMethod}</td></tr>
${transactionId ? `<tr><td style='padding:5px 0;font-size:13px;color:#888;'>Nomba Tx ID</td><td style='padding:5px 0;font-size:11px;color:#666;font-family:monospace;word-break:break-all;'>${transactionId}</td></tr>` : ""}
</table>
</td></tr>
<tr><td style='background:#f5f3ee;padding:12px 32px;border-top:1px solid #e0e0e0;'>
<p style='margin:0;font-size:11px;color:#999;text-align:center;'>Automated via Nomba webhook — no admin action required.</p>
</td></tr>
</table></td></tr></table></body></html>`;

      try {
        await transporter.sendMail({
          from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
          to: NOTIFICATION_EMAIL,
          subject: `💳 Auto-Confirmed: ${booking.reference} — ${booking.full_name} · ${dateLabel}`,
          text: stripHtml(adminHtml),
          html: adminHtml,
        });
      } catch (emailErr) {
        console.error("[webhooks/nomba] Failed to send admin email:", emailErr);
      }
    }

    return NextResponse.json({ received: true, confirmed: true });
  } catch (err) {
    console.error("[webhooks/nomba] Unhandled error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
