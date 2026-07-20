/**
 * lib/invoice.ts
 * Server-side PDF generation using pdf-lib (pure JS, zero filesystem reads).
 * Works in ALL deployment environments: Vercel, Netlify, Railway, Lovable, etc.
 * No .afm font files needed — uses PDF standard-14 fonts embedded in every viewer.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocKind = "invoice" | "receipt";

export interface InvoiceBooking {
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
    .replace(/₦/g, "NGN")
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
  // In pdf-lib, y is the baseline. 
  // We approximate the baseline as topY + size * 0.75 (Helvetica ascent is ~0.75)
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
    y: py(topY + height), // y is bottom-left
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

function t5(t: string | null | undefined): string {
  return t ? String(t).slice(0, 5) : "--:--";
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateBookingPdf(booking: InvoiceBooking, kind: DocKind): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const obl  = await doc.embedFont(StandardFonts.HelveticaOblique);

  const subtotal  = Number(booking.invoice_subtotal  ?? 0);
  const vat       = Number(booking.invoice_vat       ?? 0);
  const total     = Number(booking.invoice_total     ?? 0);
  const vatRate   = Number(process.env.VAT_RATE      ?? 7.5);
  const venueName = process.env.VENUE_NAME           || "Castle Academy";
  const today     = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const invNo     = booking.invoice_number           || booking.reference;
  const docLabel  = kind === "receipt" ? "RECEIPT" : "TAX INVOICE";

  // Top accent border
  dr(page, 0, 0, PAGE_W, 12, C_GOLD);
  
  let cy = 50;

  // ── Header ────────────────────────────────────────────────────────────────
  dt(page, venueName.toUpperCase(), ML, cy, bold, 22, C_NOIR);
  dtR(page, docLabel, MR, cy, bold, 20, C_GOLD);

  cy += 28;
  dt(page, "29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos", ML, cy, reg, 8, C_MUTED);
  dtR(page, `Reference: ${booking.reference}`, MR, cy, reg, 9, C_MUTED);

  cy += 12;
  dt(page, "thecastleacademyspace@gmail.com  |  +234 904 222 2296", ML, cy, reg, 8, C_MUTED);
  dtR(page, `Date: ${today}`, MR, cy, reg, 9, C_MUTED);

  cy += 40;
  hl(page, ML, MR, cy, C_LINE, 1.5);
  cy += 30;

  // ── Bill To & Booking Details ─────────────────────────────────────────────
  const colW = (CW - 40) / 2;
  const col2X = ML + colW + 40;

  dt(page, "BILL TO", ML, cy, bold, 8, C_MUTED);
  dt(page, "BOOKING DETAILS", col2X, cy, bold, 8, C_MUTED);

  cy += 16;
  let leftY = cy;
  let rightY = cy;

  dt(page, booking.full_name, ML, leftY, bold, 12, C_NOIR);
  leftY += 18;
  if (booking.organisation) {
    dt(page, booking.organisation, ML, leftY, reg, 10, C_MUTED);
    leftY += 15;
  }
  dt(page, booking.email, ML, leftY, reg, 10, C_MUTED);
  leftY += 15;
  if (booking.phone) {
    dt(page, booking.phone, ML, leftY, reg, 10, C_MUTED);
    leftY += 15;
  }

  dt(page, cap(booking.event_type), col2X, rightY, bold, 12, C_NOIR);
  rightY += 18;

  const dateStr = fmtDate(booking.start_date) === fmtDate(booking.end_date)
    ? fmtDate(booking.start_date)
    : `${fmtDate(booking.start_date)} to ${fmtDate(booking.end_date)}`;

  const dateLines = wrap(dateStr, reg, 10, colW);
  for (const line of dateLines) {
    dt(page, line, col2X, rightY, reg, 10, C_NOIR);
    rightY += 15;
  }
  dt(page, `${t5(booking.start_time)} – ${t5(booking.end_time)}`, col2X, rightY, reg, 10, C_MUTED);
  rightY += 15;
  dt(page, `${booking.participants} participant${booking.participants !== 1 ? "s" : ""}`, col2X, rightY, reg, 10, C_MUTED);
  rightY += 15;

  cy = Math.max(leftY, rightY) + 30;

  // ── Line Items Table ──────────────────────────────────────────────────────
  
  // Table header background
  dr(page, ML, cy, CW, 26, rgb(0.96, 0.95, 0.93)); // soft beige
  dt(page, "DESCRIPTION", ML + 12, cy + 8, bold, 9, C_NOIR);
  dtR(page, "AMOUNT", MR - 12, cy + 8, bold, 9, C_NOIR);

  cy += 26 + 18; // move past header

  const desc = (booking.invoice_breakdown && !["null", "undefined"].includes(String(booking.invoice_breakdown)))
    ? String(booking.invoice_breakdown)
    : `${cap(booking.event_type)} Booking — ${fmtDate(booking.start_date)}`;

  const descLines = wrap(desc, reg, 10, CW - 150);
  for (const line of descLines) {
    dt(page, line, ML + 12, cy, reg, 10, C_NOIR);
    cy += 16;
  }

  // Draw amount aligned with the first line of description
  dtR(page, money(subtotal), MR - 12, cy - (16 * descLines.length), reg, 10, C_NOIR);

  if (booking.discount_applied && !["None", "None (Fallback Calculation)", "null", "undefined"].includes(String(booking.discount_applied))) {
    dt(page, `Discount applied: ${booking.discount_applied}`, ML + 12, cy, obl, 9, C_MUTED);
    cy += 14;
  }

  if (booking.extras?.length) {
    dt(page, `Optional extras: ${booking.extras.join(", ")}`, ML + 12, cy, reg, 9, C_MUTED);
    cy += 14;
  }

  cy += 20;
  hl(page, ML, MR, cy, C_LINE, 1);
  cy += 20;

  // ── Totals ────────────────────────────────────────────────────────────────
  const tLX = MR - 200;

  const totLine = (label: string, value: string, isBold = false) => {
    const f  = isBold ? bold : reg;
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
  totLine(kind === "receipt" ? "Total Paid" : "Total Due", money(total), true);

  // ── PAID Stamp ────────────────────────────────────────────────────────────
  if (kind === "receipt") {
    cy += 15;
    dr(page, ML, cy, 150, 50, rgb(0.92, 0.98, 0.94), { color: C_GREEN, width: 2 });
    dtC(page, "PAID IN FULL", ML, 150, cy + 14, bold, 14, C_GREEN);
    if (booking.payment_method) {
      dtC(page, `Via ${booking.payment_method}`, ML, 150, cy + 32, reg, 9, C_GREEN);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerH = 80;
  dr(page, 0, PAGE_H - footerH, PAGE_W, footerH, C_NOIR);
  dr(page, 0, PAGE_H - footerH, PAGE_W, 3, C_GOLD); // top accent for footer

  const fY = PAGE_H - footerH + 20;
  if (kind === "invoice") {
    dt(page, "Payment Instructions", ML, fY, bold, 9, C_WHITE);
    dt(page, "Complete payment via the secure link sent to your email to confirm your booking.", ML, fY + 16, reg, 8, rgb(0.8, 0.8, 0.8));
    dt(page, "Bookings are non-refundable once confirmed. All prices are inclusive of VAT.", ML, fY + 30, reg, 7, rgb(0.5, 0.5, 0.5));
  } else {
    dt(page, "Thank you — your booking is confirmed!", ML, fY, bold, 10, C_WHITE);
    dt(page, "For assistance please contact: thecastleacademyspace@gmail.com", ML, fY + 20, reg, 8, rgb(0.8, 0.8, 0.8));
    dt(page, "All bookings are non-refundable. Prices are inclusive of VAT.", ML, fY + 34, reg, 7, rgb(0.5, 0.5, 0.5));
  }

  dtC(page, `© ${new Date().getFullYear()} ${venueName}`, 0, PAGE_W, PAGE_H - 12, reg, 7, rgb(0.4, 0.4, 0.4));

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
