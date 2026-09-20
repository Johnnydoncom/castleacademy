/**
 * lib/invoice.ts
 * Server-side PDF generation using pdf-lib (pure JS, zero filesystem reads).
 * Works in ALL deployment environments: Vercel, Netlify, Railway, Lovable, etc.
 * No .afm font files needed — uses PDF standard-14 fonts embedded in every viewer.
 *
 * Two document types:
 *   - "invoice"  → Professional invoice with line items and payment instructions
 *   - "receipt"  → Payment receipt confirming what was paid, when, and how
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { CANCELLATION_COMPACT } from "./policy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocKind = "invoice" | "receipt";

export interface InvoiceBooking {
  /** Present when the row came from `SELECT *`; used to fetch the day schedule. */
  id?: string;
  reference: string;
  invoice_number: string | null;
  full_name: string;
  organisation: string | null;
  email: string;
  phone: string | null;
  event_type: string;
  start_date: string | Date;
  end_date: string | Date;
  start_time: string;
  end_time: string;
  /**
   * Per-day schedule. A booking may run different hours on each day, so the
   * start/end columns above are only a summary. When present this is rendered
   * instead; when absent (older records) the summary is used.
   */
  days?: { date: string; start_time: string; end_time: string }[] | null;
  participants: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  invoice_subtotal: number | null;
  invoice_vat: number | null;
  invoice_total: number | null;
  invoice_breakdown: string | null;
  discount_applied: string | null;
  extras: string[] | null;
  paid_at?: string | null;
}

// ── Page constants ─────────────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 50; // margin left
const MR = PAGE_W - 50; // margin right
const CW = MR - ML; // content width

// ── Brand colours ─────────────────────────────────────────────────────────────

const C_NOIR  = rgb(0.051, 0.051, 0.051); // #0d0d0d
const C_GOLD  = rgb(0.788, 0.659, 0.298); // #c9a84c
const C_MUTED = rgb(0.467, 0.467, 0.467); // #777777
const C_LINE  = rgb(0.886, 0.867, 0.824); // #e2ddd2
const C_WHITE = rgb(1, 1, 1);
const C_GREEN = rgb(0.086, 0.635, 0.235); // #16a34a
const C_BG    = rgb(0.96, 0.95, 0.93);    // soft beige table header

// ── Coordinate helpers ────────────────────────────────────────────────────────
// pdf-lib uses bottom-left origin; we track Y from the top.

const py = (fromTop: number) => PAGE_H - fromTop;

/** Strip non-WinAnsi characters to prevent pdf-lib encoding crashes. */
function cln(text: string | null | undefined | number): string {
  if (text == null) return "";
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/₦/g, "NGN ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

/** Draw text at a from-top Y position. topY is the visual TOP of the text. */
function dt(
  page: PDFPage,
  content: string | number,
  x: number,
  topY: number,
  font: PDFFont,
  size: number,
  color: RGB,
): void {
  const safe = cln(content);
  if (!safe) return;
  page.drawText(safe, { x, y: py(topY + size * 0.75), font, size, color });
}

/** Draw right-aligned text. */
function dtR(
  page: PDFPage,
  content: string | number,
  rightX: number,
  topY: number,
  font: PDFFont,
  size: number,
  color: RGB,
): void {
  const safe = cln(content);
  if (!safe) return;
  const w = font.widthOfTextAtSize(safe, size);
  dt(page, safe, rightX - w, topY, font, size, color);
}

/** Draw centered text within [x, x+width]. */
function dtC(
  page: PDFPage,
  content: string | number,
  x: number,
  width: number,
  topY: number,
  font: PDFFont,
  size: number,
  color: RGB,
): void {
  const safe = cln(content);
  if (!safe) return;
  const w = font.widthOfTextAtSize(safe, size);
  dt(page, safe, x + (width - w) / 2, topY, font, size, color);
}

/** Draw a filled rectangle using from-top coordinates. */
function dr(
  page: PDFPage,
  x: number,
  topY: number,
  width: number,
  height: number,
  color: RGB,
  border?: { color: RGB; width: number },
): void {
  page.drawRectangle({
    x,
    y: py(topY + height),
    width,
    height,
    color,
    ...(border ? { borderColor: border.color, borderWidth: border.width } : {}),
  });
}

/** Draw a horizontal line at a from-top Y position. */
function hl(
  page: PDFPage,
  x1: number,
  x2: number,
  topY: number,
  color: RGB = C_LINE,
  thickness = 0.5,
): void {
  page.drawLine({ start: { x: x1, y: py(topY) }, end: { x: x2, y: py(topY) }, color, thickness });
}

// ── Text utilities ─────────────────────────────────────────────────────────────

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = cln(text);
  if (!safe) return [""];
  const words = safe.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [safe];
}

function money(n: number | null | undefined): string {
  return `NGN ${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try {
    const dateObj = typeof d === "string" ? new Date(d + (d.includes("T") ? "" : "T12:00:00")) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function t5(t: string | null | undefined): string {
  return t ? String(t).slice(0, 5) : "--:--";
}

function cap(s: string | null | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Human-readable event type label */
function eventLabel(s: string | null | undefined): string {
  if (!s) return "Booking";
  const map: Record<string, string> = {
    training: "Corporate Training",
    workshop: "Workshop",
    seminar: "Seminar",
    meeting: "Team Meeting",
    coaching: "Coaching Session",
    other: "Event",
  };
  return map[s] || cap(s) || "Booking";
}

/** Human-readable payment method */
function paymentMethodLabel(s: string | null | undefined): string {
  if (!s) return "N/A";
  const map: Record<string, string> = {
    manual: "Bank Transfer / Cash",
    nomba: "Online (Card / Bank)",
    card: "Card Payment",
  };
  return map[s.toLowerCase()] || cap(s);
}


// ── Shared header ──────────────────────────────────────────────────────────────

function drawHeader(
  page: PDFPage,
  booking: InvoiceBooking,
  kind: DocKind,
  fonts: { reg: PDFFont; bold: PDFFont },
): number {
  const venueName = process.env.VENUE_NAME || "Castle Academy";
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const invNo = booking.invoice_number || booking.reference;
  const docTitle = kind === "receipt" ? "PAYMENT RECEIPT" : "INVOICE";

  // Top accent border
  dr(page, 0, 0, PAGE_W, 12, C_GOLD);

  let cy = 50;

  // Company name + doc title
  dt(page, venueName.toUpperCase(), ML, cy, fonts.bold, 22, C_NOIR);
  dtR(page, docTitle, MR, cy, fonts.bold, 18, C_GOLD);

  cy += 28;
  dt(page, "29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos", ML, cy, fonts.reg, 8, C_MUTED);
  dtR(page, `${kind === "receipt" ? "Receipt" : "Invoice"} #: ${invNo}`, MR, cy, fonts.reg, 9, C_MUTED);

  cy += 12;
  dt(page, "thecastleacademyspace@gmail.com  |  +234 904 222 2296", ML, cy, fonts.reg, 8, C_MUTED);
  dtR(page, `Date: ${today}`, MR, cy, fonts.reg, 9, C_MUTED);

  cy += 12;
  dtR(page, `Ref: ${booking.reference}`, MR, cy, fonts.reg, 9, C_MUTED);

  cy += 30;
  hl(page, ML, MR, cy, C_GOLD, 1.5);

  return cy + 25;
}


// ── Shared bill-to & booking details ──────────────────────────────────────────

function drawBillToAndDetails(
  page: PDFPage,
  booking: InvoiceBooking,
  fonts: { reg: PDFFont; bold: PDFFont },
  startY: number,
): number {
  const colW = (CW - 40) / 2;
  const col2X = ML + colW + 40;

  let cy = startY;

  dt(page, "BILL TO", ML, cy, fonts.bold, 8, C_MUTED);
  dt(page, "BOOKING DETAILS", col2X, cy, fonts.bold, 8, C_MUTED);

  cy += 16;
  let leftY = cy;
  let rightY = cy;

  // Bill To section
  dt(page, booking.full_name, ML, leftY, fonts.bold, 12, C_NOIR);
  leftY += 18;
  if (booking.organisation) {
    dt(page, booking.organisation, ML, leftY, fonts.reg, 10, C_MUTED);
    leftY += 15;
  }
  dt(page, booking.email, ML, leftY, fonts.reg, 10, C_MUTED);
  leftY += 15;
  if (booking.phone) {
    dt(page, booking.phone, ML, leftY, fonts.reg, 10, C_MUTED);
    leftY += 15;
  }

  // Booking details (right column)
  dt(page, eventLabel(booking.event_type), col2X, rightY, fonts.bold, 12, C_NOIR);
  rightY += 18;

  if (booking.days && booking.days.length > 0) {
    for (const day of booking.days) {
      for (const line of wrap(fmtDate(day.date), fonts.reg, 10, colW)) {
        dt(page, line, col2X, rightY, fonts.reg, 10, C_NOIR);
        rightY += 15;
      }
      dt(page, `${t5(day.start_time)} - ${t5(day.end_time)}`, col2X, rightY, fonts.reg, 10, C_MUTED);
      rightY += 15;
    }
  } else {
    const dateStr = fmtDate(booking.start_date) === fmtDate(booking.end_date)
      ? fmtDate(booking.start_date)
      : `${fmtDate(booking.start_date)} to ${fmtDate(booking.end_date)}`;

    for (const line of wrap(dateStr, fonts.reg, 10, colW)) {
      dt(page, line, col2X, rightY, fonts.reg, 10, C_NOIR);
      rightY += 15;
    }
    dt(page, `${t5(booking.start_time)} - ${t5(booking.end_time)}`, col2X, rightY, fonts.reg, 10, C_MUTED);
    rightY += 15;
  }
  dt(page, `${booking.participants} participant${booking.participants !== 1 ? "s" : ""}`, col2X, rightY, fonts.reg, 10, C_MUTED);
  rightY += 15;

  return Math.max(leftY, rightY) + 25;
}


// ── Generate Invoice PDF ──────────────────────────────────────────────────────

function generateInvoice(
  page: PDFPage,
  booking: InvoiceBooking,
  fonts: { reg: PDFFont; bold: PDFFont; obl: PDFFont },
  startY: number,
): number {
  const subtotal = Number(booking.invoice_subtotal ?? 0);
  const vat      = Number(booking.invoice_vat ?? 0);
  const total    = Number(booking.invoice_total ?? 0);
  const vatRate  = booking.invoice_subtotal && booking.invoice_vat
    ? Math.round((booking.invoice_vat / booking.invoice_subtotal) * 1000) / 10
    : Number(process.env.VAT_RATE ?? 7.5);
  const venueName = process.env.VENUE_NAME || "Castle Academy";

  let cy = startY;

  // ── Line Items Table ────────────────────────────────────────────────────
  dr(page, ML, cy, CW, 26, C_BG);
  dt(page, "DESCRIPTION", ML + 12, cy + 8, fonts.bold, 9, C_NOIR);
  dtR(page, "AMOUNT", MR - 12, cy + 8, fonts.bold, 9, C_NOIR);

  cy += 44;

  // Build a proper description from event type + date summary
  const dateLabel = booking.days && booking.days.length > 0
    ? booking.days.length === 1
      ? fmtDate(booking.days[0].date)
      : `${booking.days.length} days, ${fmtDate(booking.days[0].date)} - ${fmtDate(booking.days[booking.days.length - 1].date)}`
    : fmtDate(booking.start_date);

  const eventName = eventLabel(booking.event_type);
  const primaryDesc = `${eventName} - Venue hire`;
  const secondaryDesc = dateLabel;

  // Primary description
  const descLines = wrap(primaryDesc, fonts.reg, 10, CW - 150);
  for (const line of descLines) {
    dt(page, line, ML + 12, cy, fonts.reg, 10, C_NOIR);
    cy += 16;
  }

  // Date as sub-line
  dt(page, secondaryDesc, ML + 12, cy, fonts.reg, 9, C_MUTED);
  cy += 14;

  // Participants
  dt(page, `${booking.participants} participant${booking.participants !== 1 ? "s" : ""}`, ML + 12, cy, fonts.reg, 9, C_MUTED);
  cy += 14;

  // Amount on the right, aligned with primary desc
  dtR(page, money(subtotal), MR - 12, cy - (16 * descLines.length) - 28, fonts.reg, 10, C_NOIR);

  // Breakdown (if available from pricing engine)
  if (booking.invoice_breakdown && !["null", "undefined"].includes(String(booking.invoice_breakdown))) {
    const breakdownLines = wrap(String(booking.invoice_breakdown), fonts.reg, 9, CW - 40);
    for (const line of breakdownLines) {
      dt(page, line, ML + 12, cy, fonts.obl, 8.5, C_MUTED);
      cy += 13;
    }
  }

  // Discount
  if (booking.discount_applied && !["None", "None (Fallback Calculation)", "null", "undefined"].includes(String(booking.discount_applied))) {
    dt(page, `Discount: ${booking.discount_applied}`, ML + 12, cy, fonts.obl, 9, C_MUTED);
    cy += 14;
  }

  // Extras
  if (booking.extras?.length) {
    dt(page, `Add-ons requested: ${booking.extras.join(", ")}`, ML + 12, cy, fonts.reg, 9, C_MUTED);
    cy += 14;
  }

  cy += 16;
  hl(page, ML, MR, cy, C_LINE, 1);
  cy += 20;

  // ── Totals ──────────────────────────────────────────────────────────────
  const tLX = MR - 220;

  const totLine = (label: string, value: string, isBold = false) => {
    const f  = isBold ? fonts.bold : fonts.reg;
    const sz = isBold ? 12 : 10;
    const cl = isBold ? C_NOIR : C_MUTED;
    dt(page, label, tLX, cy, f, sz, cl);
    dtR(page, value, MR, cy, f, sz, cl);
    cy += isBold ? 24 : 20;
  };

  totLine("Subtotal (excl. VAT)", money(subtotal));
  totLine(`VAT (${vatRate}%)`, money(vat));
  hl(page, tLX, MR, cy - 8, C_LINE, 1);
  cy += 4;
  totLine("Total Due", money(total), true);

  // ── Payment status badge ────────────────────────────────────────────────
  if (booking.payment_status === "paid") {
    cy += 5;
    dr(page, ML, cy, 160, 50, rgb(0.92, 0.98, 0.94), { color: C_GREEN, width: 2 });
    dtC(page, "PAID IN FULL", ML, 160, cy + 14, fonts.bold, 14, C_GREEN);
    if (booking.payment_method) {
      dtC(page, `Via ${paymentMethodLabel(booking.payment_method)}`, ML, 160, cy + 32, fonts.reg, 9, C_GREEN);
    }
    cy += 60;
  }

  return cy;
}


// ── Generate Receipt PDF ──────────────────────────────────────────────────────

function generateReceipt(
  page: PDFPage,
  booking: InvoiceBooking,
  fonts: { reg: PDFFont; bold: PDFFont; obl: PDFFont },
  startY: number,
): number {
  const subtotal = Number(booking.invoice_subtotal ?? 0);
  const vat      = Number(booking.invoice_vat ?? 0);
  const total    = Number(booking.invoice_total ?? 0);
  const vatRate  = booking.invoice_subtotal && booking.invoice_vat
    ? Math.round((booking.invoice_vat / booking.invoice_subtotal) * 1000) / 10
    : Number(process.env.VAT_RATE ?? 7.5);
  const venueName = process.env.VENUE_NAME || "Castle Academy";

  let cy = startY;

  // ── Compact PAID bar ─────────────────────────────────────────────────────
  dr(page, ML, cy, CW, 24, rgb(0.92, 0.98, 0.94), { color: C_GREEN, width: 1.5 });
  dt(page, "PAYMENT CONFIRMED", ML + 12, cy + 7, fonts.bold, 10, C_GREEN);
  dtR(page, money(total), MR - 12, cy + 7, fonts.bold, 10, C_GREEN);
  cy += 36;

  // ── Payment Details ─────────────────────────────────────────────────────
  dr(page, ML, cy, CW, 22, C_BG);
  dt(page, "PAYMENT DETAILS", ML + 12, cy + 6, fonts.bold, 8, C_NOIR);
  cy += 30;

  const detailRow = (label: string, value: string) => {
    dt(page, label, ML + 12, cy, fonts.reg, 9, C_MUTED);
    dt(page, value, ML + 150, cy, fonts.reg, 9, C_NOIR);
    cy += 15;
  };

  detailRow("Amount Paid:", money(total));
  detailRow("Payment Method:", paymentMethodLabel(booking.payment_method));
  detailRow("Payment Date:", booking.paid_at ? fmtDateTime(booking.paid_at) : "N/A");
  detailRow("Booking Reference:", booking.reference);
  if (booking.invoice_number && booking.invoice_number !== booking.reference) {
    detailRow("Invoice Number:", booking.invoice_number);
  }

  cy += 6;
  hl(page, ML, MR, cy, C_LINE, 1);
  cy += 14;

  // ── Booking Summary ─────────────────────────────────────────────────────
  dr(page, ML, cy, CW, 22, C_BG);
  dt(page, "BOOKING SUMMARY", ML + 12, cy + 6, fonts.bold, 8, C_NOIR);
  cy += 30;

  detailRow("Event Type:", eventLabel(booking.event_type));
  detailRow("Participants:", `${booking.participants}`);

  // Schedule
  if (booking.days && booking.days.length > 0) {
    dt(page, "Schedule:", ML + 12, cy, fonts.reg, 9, C_MUTED);
    for (const day of booking.days) {
      const dayStr = `${fmtDate(day.date)} (${t5(day.start_time)} - ${t5(day.end_time)})`;
      const dayLines = wrap(dayStr, fonts.reg, 9, CW - 170);
      for (const line of dayLines) {
        dt(page, line, ML + 150, cy, fonts.reg, 9, C_NOIR);
        cy += 14;
      }
    }
  } else {
    const dateStr = fmtDate(booking.start_date) === fmtDate(booking.end_date)
      ? fmtDate(booking.start_date)
      : `${fmtDate(booking.start_date)} to ${fmtDate(booking.end_date)}`;
    detailRow("Date:", dateStr);
    detailRow("Time:", `${t5(booking.start_time)} - ${t5(booking.end_time)}`);
  }

  if (booking.extras?.length) {
    dt(page, "Add-ons:", ML + 12, cy, fonts.reg, 9, C_MUTED);
    const extrasLines = wrap(booking.extras.join(", "), fonts.reg, 9, CW - 170);
    for (const line of extrasLines) {
      dt(page, line, ML + 150, cy, fonts.reg, 9, C_NOIR);
      cy += 14;
    }
  }

  cy += 6;
  hl(page, ML, MR, cy, C_LINE, 1);
  cy += 14;

  // ── Amount Breakdown ────────────────────────────────────────────────────
  dr(page, ML, cy, CW, 22, C_BG);
  dt(page, "AMOUNT BREAKDOWN", ML + 12, cy + 6, fonts.bold, 8, C_NOIR);
  cy += 30;

  const tLX = MR - 220;

  const totLine = (label: string, value: string, isBold = false) => {
    const f  = isBold ? fonts.bold : fonts.reg;
    const sz = isBold ? 11 : 10;
    const cl = isBold ? C_NOIR : C_MUTED;
    dt(page, label, tLX, cy, f, sz, cl);
    dtR(page, value, MR, cy, f, sz, cl);
    cy += isBold ? 20 : 16;
  };

  // Description line
  const eventName = eventLabel(booking.event_type);
  dt(page, `${eventName} - Venue hire`, ML + 12, cy, fonts.reg, 10, C_NOIR);
  dtR(page, money(subtotal), MR - 12, cy, fonts.reg, 10, C_NOIR);
  cy += 16;

  if (booking.discount_applied && !["None", "None (Fallback Calculation)", "null", "undefined"].includes(String(booking.discount_applied))) {
    dt(page, `Discount: ${booking.discount_applied}`, ML + 12, cy, fonts.obl, 9, C_MUTED);
    cy += 14;
  }

  cy += 4;
  hl(page, tLX, MR, cy, C_LINE, 0.5);
  cy += 10;

  totLine("Subtotal (excl. VAT)", money(subtotal));
  totLine(`VAT (${vatRate}%)`, money(vat));
  hl(page, tLX, MR, cy - 6, C_LINE, 1);
  cy += 2;
  totLine("Total Paid", money(total), true);

  return cy;
}


// ── Footer drawing ─────────────────────────────────────────────────────────────

function drawFooter(
  page: PDFPage,
  kind: DocKind,
  fonts: { reg: PDFFont; bold: PDFFont },
): void {
  const venueName = process.env.VENUE_NAME || "Castle Academy";
  const footerH = kind === "invoice" ? 80 : 70;

  dr(page, 0, PAGE_H - footerH, PAGE_W, footerH, C_NOIR);
  dr(page, 0, PAGE_H - footerH, PAGE_W, 3, C_GOLD);

  const fY = PAGE_H - footerH + 18;

  if (kind === "invoice") {
    dt(page, "Payment Instructions", ML, fY, fonts.bold, 9, C_WHITE);
    dt(page, "Complete payment via the secure link sent to your email, or contact us for bank transfer details.", ML, fY + 16, fonts.reg, 8, rgb(0.8, 0.8, 0.8));
    dt(page, CANCELLATION_COMPACT, ML, fY + 30, fonts.reg, 7, rgb(0.5, 0.5, 0.5));
    dt(page, "Payment due within 48 hours of invoice date.", ML, fY + 42, fonts.reg, 7, rgb(0.5, 0.5, 0.5));
  } else {
    dt(page, "Thank you - your booking is confirmed!", ML, fY, fonts.bold, 10, C_WHITE);
    dt(page, "This receipt confirms your payment has been received. Please retain this for your records.", ML, fY + 18, fonts.reg, 8, rgb(0.8, 0.8, 0.8));
    dt(page, "For assistance: thecastleacademyspace@gmail.com  |  +234 904 222 2296", ML, fY + 32, fonts.reg, 7, rgb(0.5, 0.5, 0.5));
  }

  dtC(page, `${venueName}  |  thecastleacademyspace@gmail.com  |  +234 904 222 2296`, 0, PAGE_W, PAGE_H - 12, fonts.reg, 7, rgb(0.4, 0.4, 0.4));
}


// ── Main export ────────────────────────────────────────────────────────────────

export async function generateBookingPdf(booking: InvoiceBooking, kind: DocKind): Promise<Buffer> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_W, PAGE_H]);

  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const obl  = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fonts = { reg, bold, obl };

  // ── Shared header ───────────────────────────────────────────────────────
  let cy = drawHeader(page, booking, kind, fonts);

  // ── Bill To & Booking Details ───────────────────────────────────────────
  cy = drawBillToAndDetails(page, booking, fonts, cy);

  // ── Kind-specific content ───────────────────────────────────────────────
  if (kind === "receipt") {
    cy = generateReceipt(page, booking, fonts, cy);
  } else {
    cy = generateInvoice(page, booking, fonts, cy);
  }

  // ── Footer — draw on current page, or add a new page if content overflows
  const footerH = kind === "invoice" ? 80 : 70;
  const footerThreshold = PAGE_H - footerH - 20; // 20px breathing room

  if (cy > footerThreshold) {
    // Content ran past the footer zone — add a second page for the footer
    page = doc.addPage([PAGE_W, PAGE_H]);
  }
  drawFooter(page, kind, fonts);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
