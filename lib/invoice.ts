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
  start_date: string;
  end_date: string;
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
const C_INK   = rgb(0.133, 0.133, 0.133); // #222222
const C_MUTED = rgb(0.467, 0.467, 0.467); // #777777
const C_LINE  = rgb(0.886, 0.867, 0.824); // #e2ddd2
const C_CREAM = rgb(0.984, 0.976, 0.953); // #fbf9f3
const C_WHITE = rgb(1, 1, 1);
const C_GREEN = rgb(0.086, 0.635, 0.235); // #16a34a
const C_GREEN_BG = rgb(0.922, 0.980, 0.941);
const C_GRAY  = rgb(0.400, 0.400, 0.400);

// ── Coordinate helpers ────────────────────────────────────────────────────────
// pdf-lib uses bottom-left origin; we track Y from the top like pdfkit.

/** Convert from-top Y to pdf-lib from-bottom Y. */
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

/** Draw text at a from-top Y position. */
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
  page.drawText(safe, { x, y: py(topY), font, size, color });
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

/** NGN prefix instead of ₦ — standard PDF fonts are Latin-only. */
function money(n: number | null | undefined): string {
  return `NGN ${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
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

  // ── Page background ─────────────────────────────────────────────────────────
  dr(page, 0, 0, PAGE_W, PAGE_H, C_CREAM);

  // ── Header (dark bar) ───────────────────────────────────────────────────────
  dr(page, 0, 0, PAGE_W, 90, C_NOIR);

  dt(page, venueName.toUpperCase(), ML, 22, bold, 15, C_WHITE);
  dt(page, "29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos", ML, 42, reg, 7, C_GOLD);
  dt(page, "thecastleacademyspace@gmail.com  |  +234 904 222 2296", ML, 56, reg, 7, C_MUTED);

  dtR(page, docLabel, MR, 22, bold, 14, C_WHITE);
  dtR(page, `No. ${invNo}`, MR, 40, reg, 8, C_MUTED);
  dtR(page, today, MR, 54, reg, 8, C_MUTED);

  // Gold accent line
  dr(page, 0, 90, PAGE_W, 7, C_GOLD);

  let cy = 115;

  // ── Bill To  +  Booking Details (two columns) ───────────────────────────────
  const col2X = ML + CW / 2 + 15;
  const colW  = CW / 2 - 20;

  dt(page, "BILL TO",          ML,     cy, bold, 7.5, C_GOLD);
  dt(page, "BOOKING DETAILS",  col2X,  cy, bold, 7.5, C_GOLD);
  cy += 14;

  dt(page, booking.full_name,          ML,    cy, bold, 11, C_INK);
  dt(page, cap(booking.event_type),    col2X, cy, bold, 11, C_INK);
  cy += 15;

  let leftCy  = cy;
  let rightCy = cy;

  if (booking.organisation) {
    dt(page, booking.organisation, ML, leftCy, reg, 9, C_MUTED);
    leftCy += 13;
  }
  dt(page, booking.email, ML, leftCy, reg, 9, C_MUTED);
  leftCy += 13;
  if (booking.phone) {
    dt(page, booking.phone, ML, leftCy, reg, 9, C_MUTED);
    leftCy += 13;
  }

  const dateStr = booking.start_date === booking.end_date
    ? fmtDate(booking.start_date)
    : `${fmtDate(booking.start_date)} to ${fmtDate(booking.end_date)}`;
  const dateLines = wrap(dateStr, reg, 9, colW);
  for (const line of dateLines) {
    dt(page, line, col2X, rightCy, reg, 9, C_MUTED);
    rightCy += 13;
  }
  dt(page, `${t5(booking.start_time)} – ${t5(booking.end_time)}`, col2X, rightCy, reg, 9, C_MUTED);
  rightCy += 13;
  dt(page, `${booking.participants} participant${booking.participants !== 1 ? "s" : ""}`, col2X, rightCy, reg, 9, C_MUTED);
  rightCy += 13;

  cy = Math.max(leftCy, rightCy) + 16;

  hl(page, ML, MR, cy);
  cy += 18;

  // ── Line items ──────────────────────────────────────────────────────────────
  // Header row
  dr(page, ML, cy, CW, 18, C_NOIR);
  dt(page,  "DESCRIPTION", ML + 8, cy + 5, bold, 7.5, C_WHITE);
  dtR(page, "AMOUNT",      MR - 8, cy + 5, bold, 7.5, C_WHITE);
  cy += 22;

  const desc = (booking.invoice_breakdown && !["null", "undefined"].includes(String(booking.invoice_breakdown)))
    ? String(booking.invoice_breakdown)
    : `${cap(booking.event_type)} — ${fmtDate(booking.start_date)}`;

  const descLines = wrap(desc, reg, 9, CW - 140);
  for (const line of descLines) {
    dt(page, line, ML + 8, cy, reg, 9, C_INK);
    cy += 13;
  }
  dtR(page, money(subtotal), MR - 8, cy - 13, reg, 9, C_INK);

  if (
    booking.discount_applied &&
    !["None", "None (Fallback Calculation)", "null", "undefined"].includes(String(booking.discount_applied))
  ) {
    dt(page, `Discount applied: ${booking.discount_applied}`, ML + 8, cy, obl, 8, C_MUTED);
    cy += 13;
  }

  if (booking.extras?.length) {
    dt(page, `Optional extras: ${booking.extras.join(", ")}`, ML + 8, cy, reg, 8, C_MUTED);
    cy += 13;
  }

  cy += 10;
  hl(page, ML, MR, cy);
  cy += 14;

  // ── Totals ──────────────────────────────────────────────────────────────────
  const tLX = MR - 235;

  const totLine = (label: string, value: string, isBold = false) => {
    const f  = isBold ? bold : reg;
    const sz = isBold ? 11   : 9.5;
    const cl = isBold ? C_INK : C_MUTED;
    dt(page,  label, tLX,    cy, f, sz, cl);
    dtR(page, value, MR - 8, cy, f, sz, cl);
    cy += isBold ? 22 : 15;
  };

  totLine("Subtotal (excl. VAT)", money(subtotal));
  totLine(`VAT (${vatRate}%)`,    money(vat));
  hl(page, tLX, MR, cy - 4, C_INK, 0.75);
  cy += 4;
  totLine(kind === "receipt" ? "Amount Paid" : "Total Due", money(total), true);

  // ── PAID stamp (receipts only) ──────────────────────────────────────────────
  if (kind === "receipt") {
    cy += 8;
    const stampW = 130, stampH = 44;
    dr(page, ML, cy, stampW, stampH, C_GREEN_BG, { color: C_GREEN, width: 2.5 });
    dtC(page, "PAID", ML, stampW, cy + 10, bold, 22, C_GREEN);
    if (booking.payment_method) {
      dt(page, `Via ${booking.payment_method}`, ML + 6, cy + stampH + 8, reg, 7.5, C_MUTED);
    }
    cy += stampH + 22;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footerH = 76;
  dr(page, 0, PAGE_H - footerH, PAGE_W, footerH, C_NOIR);
  hl(page, ML, MR, PAGE_H - footerH + 1, C_GOLD, 0.5);

  const fY = PAGE_H - footerH + 18;
  if (kind === "invoice") {
    dt(page, "Payment Instructions", ML, fY, bold, 8.5, C_WHITE);
    const instrLines = wrap(
      "Complete payment via the secure link sent to your email to confirm your booking. Your slot is held for 6 hours from the time of booking.",
      reg, 7.5, CW
    );
    let iy = fY + 14;
    for (const line of instrLines) { dt(page, line, ML, iy, reg, 7.5, C_MUTED); iy += 11; }
    dt(page, "Bookings are non-refundable once confirmed. All prices are inclusive of VAT.", ML, iy + 3, reg, 7, C_GRAY);
  } else {
    dt(page, "Thank you — your booking is confirmed!", ML, fY, bold, 9, C_WHITE);
    dt(page, "For assistance please contact: thecastleacademyspace@gmail.com", ML, fY + 16, reg, 7.5, C_MUTED);
    dt(page, "All bookings are non-refundable. Prices are inclusive of VAT.", ML, fY + 30, reg, 7, C_GRAY);
  }

  dtC(page, `© ${new Date().getFullYear()} ${venueName}`, 0, PAGE_W, PAGE_H - 8, reg, 7, C_MUTED);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
