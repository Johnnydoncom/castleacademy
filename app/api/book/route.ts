import { NextResponse, after } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || "2349042222296";
const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";
const VAT_RATE = parseFloat(process.env.VAT_RATE || "7.5");

const invoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    totalPrice: { type: Type.INTEGER, description: "The final total price in Naira" },
    discountApplied: { type: Type.STRING, description: "Name of the discount applied" },
    breakdown: { type: Type.STRING, description: "Short explanation of the calculation" }
  },
  required: ["totalPrice", "discountApplied", "breakdown"],
};

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

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Defer the heavy lifting to the background
    after(async () => {
      try {
        // 1. Calculate AI Pricing
        const pricingRulesPath = path.join(process.cwd(), 'pricing-rules.txt');
        const pricingRules = await fs.readFile(pricingRulesPath, 'utf-8');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        const prompt = `You are an automated pricing engine for Castle Academy.
          Here are the rules: ${pricingRules}
          Calculate the price for this booking: ${JSON.stringify(data, null, 2)}
          Provide totalPrice (number), discountApplied, and breakdown.`;

        const aiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', responseSchema: invoiceSchema },
        });

        const invoice = JSON.parse(aiRes.text || "{}");
        const subtotal = Number(invoice.totalPrice) || 0;
        const vatAmount = Math.round(subtotal * VAT_RATE / 100);
        const vatTotal = subtotal + vatAmount;

        data.invoiceSubtotal = subtotal;
        data.invoiceVatRate = VAT_RATE;
        data.invoiceVatAmount = vatAmount;
        data.invoiceTotal = vatTotal;        // grand total inc. VAT
        data.invoiceBreakdown = invoice.breakdown;
        data.discountApplied = invoice.discountApplied;

        // 2. Setup Nodemailer
        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
          console.warn("SMTP credentials not configured. Skipping emails.");
        } else {
          const smtpOptions: any = {
            auth: {
              user: process.env.SMTP_EMAIL,
              pass: process.env.SMTP_PASSWORD,
            },
          };

          if (process.env.SMTP_HOST) {
            smtpOptions.host = process.env.SMTP_HOST;
            smtpOptions.port = Number(process.env.SMTP_PORT) || 465;
            smtpOptions.secure = process.env.SMTP_SECURE === 'false' ? false : true;
          } else {
            smtpOptions.service = 'gmail';
          }

          const transporter = nodemailer.createTransport(smtpOptions);

          // 3. Send Admin Email
          const dateLabel = data.startDate === data.endDate ? data.startDate : data.startDate + " → " + data.endDate;
          const adminHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
            <table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
            <tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
            <img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;' />
            <p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>New Booking Request</p>
            </td></tr>
            <tr><td style='background:#c9a84c;padding:12px 32px;'>
            <p style='margin:0;color:#0d0d0d;font-size:14px;font-weight:600;'>Date: ${dateLabel} &nbsp;|&nbsp; Time: ${data.startTime} – ${data.endTime} &nbsp;|&nbsp; Participants: ${data.participants}</p>
            </td></tr>
            <tr><td style='padding:28px 32px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
            ${row("Full Name", data.fullName)}
            ${row("Organisation", data.organisation || "—")}
            ${row("Phone", data.phone)}
            ${row("Email", data.email)}
            ${row("Event Type", formatEventType(data.eventType))}
            ${row("Start Date", data.startDate)}
            ${row("End Date", data.endDate)}
            ${row("Start Time", data.startTime)}
            ${row("End Time", data.endTime)}
            ${row("Participants", String(data.participants))}
            ${row("Optional Extras", formatExtras(data.extras))}
            ${data.invoiceSubtotal ? row("Subtotal (ex. VAT)", "₦" + Number(data.invoiceSubtotal).toLocaleString()) : ""}
            ${data.discountApplied ? row("Discount Applied", data.discountApplied) : ""}
            ${data.invoiceVatAmount ? row(`VAT (${data.invoiceVatRate}%)`, "₦" + Number(data.invoiceVatAmount).toLocaleString()) : ""}
            ${data.invoiceTotal ? row("Total Payable (inc. VAT)", "<strong>₦" + Number(data.invoiceTotal).toLocaleString() + "</strong>") : ""}
            ${data.invoiceBreakdown ? row("Pricing Breakdown", data.invoiceBreakdown) : ""}
            </table></td></tr>
            <tr><td style='background:#f5f3ee;padding:16px 32px;border-top:1px solid #e0e0e0;'>
            <p style='margin:0;font-size:11px;color:#999;text-align:center;'>Automated notification from the ${VENUE_NAME} booking form.</p>
            </td></tr>
            </table></td></tr></table></body></html>`;

          await transporter.sendMail({
            from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
            to: NOTIFICATION_EMAIL,
            subject: `[${VENUE_NAME}] New Booking — ${safe(data.fullName)} · ${safe(data.startDate)}`,
            text: stripHtml(adminHtml),
            html: adminHtml
          });

          // 4. Send Customer Email
          if (data.email) {
            const firstName = (data.fullName || "there").split(" ")[0];
            const waNumber = SUPPORT_WHATSAPP.replace(/\D/g, "");
            const year = new Date().getFullYear();
            const customerHtml = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>
              <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>
              <table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>
              <tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>
              <img src='${APP_URL}/logo.png' alt='${VENUE_NAME}' height='48' style='display:block;margin:0 auto 12px;' />
              <p style='margin:6px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos</p>
              </td></tr>
              <tr><td style='padding:32px;'>
              <h2 style='margin:0 0 8px;color:#0d0d0d;font-size:20px;'>Hi ${firstName}, we got your request!</h2>
              <p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Thank you for choosing ${VENUE_NAME}. We've received your booking request and our team will review it and get back to you within a few hours during business hours (Monday–Saturday, 9 am – 6 pm WAT).</p>
              <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;border-radius:8px;margin-bottom:24px;'><tr><td style='padding:20px;'>
              <p style='margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0d0d0d;'>Your booking summary & invoice</p>
              <table width='100%' cellpadding='0' cellspacing='0'>
              ${row("Date(s)", dateLabel)}
              ${row("Time", data.startTime + " – " + data.endTime)}
              ${row("Event type", formatEventType(data.eventType))}
              ${row("Participants", String(data.participants))}
              ${data.invoiceSubtotal ? row("Subtotal (ex. VAT)", "₦" + Number(data.invoiceSubtotal).toLocaleString()) : ""}
              ${data.discountApplied ? row("Discount Applied", data.discountApplied) : ""}
              ${data.invoiceVatAmount ? row(`VAT (${data.invoiceVatRate}%)`, "₦" + Number(data.invoiceVatAmount).toLocaleString()) : ""}
              ${data.invoiceTotal ? row("Total Payable (inc. VAT)", "<strong>₦" + Number(data.invoiceTotal).toLocaleString() + "</strong>") : ""}
              ${data.invoiceBreakdown ? row("Pricing Breakdown", data.invoiceBreakdown) : ""}
              ${data.extras?.length ? row("Optional Extras", formatExtras(data.extras)) : ""}
              </table></td></tr></table>
              <p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Once we confirm availability, we'll send you payment instructions. You can also reach us directly on WhatsApp:</p>
              <a href='https://wa.me/${waNumber}' style='display:inline-block;background:#25d366;color:#fff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:24px;'>Chat on WhatsApp</a>
              <p style='margin:20px 0 0;color:#888;font-size:12px;line-height:1.6;'>If you didn't submit this booking request, please ignore this email.<br>Reply to <a href='mailto:${NOTIFICATION_EMAIL}' style='color:#c9a84c;'>${NOTIFICATION_EMAIL}</a> if you have any concerns.</p>
              </td></tr>
              <tr><td style='background:#0d0d0d;padding:20px 32px;text-align:center;'>
              <p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© ${year} ${VENUE_NAME} · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>
              </td></tr>
              </table></td></tr></table></body></html>`;

            await transporter.sendMail({
              from: `"${VENUE_NAME}" <${process.env.SMTP_EMAIL}>`,
              to: data.email,
              replyTo: NOTIFICATION_EMAIL,
              subject: `Your ${VENUE_NAME} booking request has been received`,
              text: stripHtml(customerHtml),
              html: customerHtml
            });
          }
        }

        // 5. Forward to Google Apps Script for Spreadsheet Logging
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

    return NextResponse.json({ success: true, message: "Booking accepted" });
  } catch (error) {
    console.error('[API] Request processing failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to accept booking' }, { status: 500 });
  }
}
