/**
 * lib/mailer.ts
 * Shared email helpers (transporter + branded messages) used by the
 * customer "resend" / reschedule flows. Node runtime only.
 */
import nodemailer from "nodemailer";
import { generateBookingPdf, type InvoiceBooking } from "./invoice";

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";

export function createTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return null;
  const opts: Record<string, unknown> = {
    auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
  };
  if (process.env.SMTP_HOST) {
    opts.host = process.env.SMTP_HOST;
    opts.port = Number(process.env.SMTP_PORT) || 465;
    opts.secure = process.env.SMTP_SECURE === "false" ? false : true;
  } else {
    opts.service = "gmail";
  }
  return nodemailer.createTransport(opts as never);
}

function naira(n: number | null | undefined) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function shell(inner: string) {
  return `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
<tr><td style='background:#0d0d0d;padding:24px 32px;text-align:center;'>
<img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='42' style='display:block;margin:0 auto;'/>
</td></tr>
${inner}
<tr><td style='background:#0d0d0d;padding:18px 32px;text-align:center;'>
<p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© ${new Date().getFullYear()} ${VENUE_NAME} · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Re-send the payment link + fresh pro-forma invoice PDF to a customer. */
export async function resendInvoiceEmail(booking: InvoiceBooking): Promise<boolean> {
  const t = createTransporter();
  if (!t) return false;
  const firstName = (booking.full_name || "there").split(" ")[0];
  const pdf = await generateBookingPdf(booking, "invoice");
  const payBlock = booking["checkout_link" as keyof InvoiceBooking]
    ? `<a href='${(booking as unknown as { checkout_link: string }).checkout_link}' style='display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:600;text-decoration:none;'>Pay Now — ${naira(booking.invoice_total)} →</a>`
    : `<p style='color:#444;font-size:14px;'>Please contact us to complete your payment.</p>`;

  const html = shell(`<tr><td style='padding:28px 32px;'>
<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:19px;'>Hi ${firstName}, here's your invoice again</h2>
<p style='margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;'>Booking <strong>${booking.reference}</strong> — amount due <strong>${naira(booking.invoice_total)}</strong> (inc. VAT). Your invoice is attached as a PDF.</p>
${payBlock}
<p style='margin:16px 0 0;color:#b45309;font-size:12px;font-weight:600;'>⚠️ Once confirmed, bookings cannot be cancelled or refunded.</p>
</td></tr>`);

  await t.sendMail({
    from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
    to: booking.email,
    replyTo: NOTIFICATION_EMAIL,
    subject: `Your ${VENUE_NAME} invoice — Ref: ${booking.reference}`,
    text: stripHtml(html),
    html,
    attachments: [{ filename: `Invoice-${booking.reference}.pdf`, content: pdf }],
  });
  return true;
}

/** Re-send the paid receipt PDF to a customer. */
export async function resendReceiptEmail(booking: InvoiceBooking): Promise<boolean> {
  const t = createTransporter();
  if (!t) return false;
  const firstName = (booking.full_name || "there").split(" ")[0];
  const pdf = await generateBookingPdf(booking, "receipt");
  const html = shell(`<tr><td style='padding:28px 32px;'>
<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:19px;'>Hi ${firstName}, here's your receipt</h2>
<p style='margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;'>Your payment for booking <strong>${booking.reference}</strong> is confirmed. The receipt is attached as a PDF.</p>
</td></tr>`);
  await t.sendMail({
    from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
    to: booking.email,
    replyTo: NOTIFICATION_EMAIL,
    subject: `Your ${VENUE_NAME} receipt — Ref: ${booking.reference}`,
    text: stripHtml(html),
    html,
    attachments: [{ filename: `Receipt-${booking.reference}.pdf`, content: pdf }],
  });
  return true;
}

/** Send a password-reset link to a customer. */
export async function sendPasswordResetEmail(email: string, name: string, link: string): Promise<boolean> {
  const t = createTransporter();
  if (!t) return false;
  const firstName = (name || "there").split(" ")[0];
  const html = shell(`<tr><td style='padding:28px 32px;'>
<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:19px;'>Hi ${firstName}, reset your password</h2>
<p style='margin:0 0 18px;color:#444;font-size:14px;line-height:1.6;'>We received a request to reset the password for your ${VENUE_NAME} account. Click the button below to choose a new password. This link expires in 1 hour.</p>
<a href='${link}' style='display:inline-block;background:#c9a84c;color:#0d0d0d;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:700;text-decoration:none;'>Reset my password →</a>
<p style='margin:18px 0 0;color:#777;font-size:12px;line-height:1.6;'>If you didn't request this, you can safely ignore this email — your password won't change. If the button doesn't work, paste this link into your browser:<br><span style='color:#555;word-break:break-all;'>${link}</span></p>
</td></tr>`);
  await t.sendMail({
    from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
    to: email,
    replyTo: NOTIFICATION_EMAIL,
    subject: `Reset your ${VENUE_NAME} password`,
    text: stripHtml(html) + `\n\nReset link: ${link}`,
    html,
  });
  return true;
}

/** Notify the admin that a customer requested a reschedule. */
export async function notifyAdminReschedule(
  booking: InvoiceBooking,
  req: { date: string; startTime: string; endTime: string; reason?: string }
): Promise<boolean> {
  const t = createTransporter();
  if (!t) return false;
  const html = shell(`<tr><td style='background:#7c3aed;padding:12px 32px;'>
<p style='margin:0;color:#fff;font-size:14px;font-weight:600;'>🔁 Reschedule requested — ${booking.reference}</p></td></tr>
<tr><td style='padding:24px 32px;'>
<p style='margin:0 0 12px;color:#444;font-size:14px;'><strong>${booking.full_name}</strong> (${booking.email}) requested to move booking <strong>${booking.reference}</strong>.</p>
<p style='margin:0 0 6px;font-size:13px;color:#222;'>Current: ${booking.start_date} ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)}</p>
<p style='margin:0 0 6px;font-size:13px;color:#222;'>Requested: <strong>${req.date} ${req.startTime}–${req.endTime}</strong></p>
${req.reason ? `<p style='margin:8px 0 0;font-size:13px;color:#555;'>Reason: ${req.reason}</p>` : ""}
<p style='margin:16px 0 0;font-size:12px;color:#777;'>Review and approve/decline in the admin dashboard.</p>
</td></tr>`);
  await t.sendMail({
    from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
    to: NOTIFICATION_EMAIL,
    subject: `🔁 Reschedule request: ${booking.reference} — ${booking.full_name}`,
    text: stripHtml(html),
    html,
  });
  return true;
}
