/**
 * lib/invoice.ts
 * Server-side PDF generation for booking invoices (pro-forma) and receipts (paid).
 * Built with pdfkit (pure-JS, no native deps). Node runtime only.
 *
 * Usage:
 *   const pdf = await generateBookingPdf(booking, "invoice"); // Buffer
 *   const pdf = await generateBookingPdf(booking, "receipt");
 */
import PDFDocument from "pdfkit";

// ── Brand / venue constants ──────────────────────────────────────────────
const NOIR = "#0d0d0d";
const GOLD = "#c9a84c";
const INK = "#222222";
const MUTED = "#777777";
const LINE = "#e2ddd2";

const VENUE_NAME = process.env.VENUE_NAME || "Castle Academy";
const VENUE_ADDRESS = "29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos";
const VENUE_EMAIL = process.env.NOTIFICATION_EMAIL || "thecastleacademyspace@gmail.com";
const VENUE_WHATSAPP = process.env.SUPPORT_WHATSAPP || "2349042222296";
const VAT_RATE = parseFloat(process.env.VAT_RATE || "7.5");

const EVENT_TYPE_MAP: Record<string, string> = {
  training: "Corporate Training",
  workshop: "Workshop",
  seminar: "Seminar",
  meeting: "Team Meeting",
  coaching: "Coaching Session",
  other: "Other",
};

export interface InvoiceBooking {
  reference: string;
  invoice_number?: string | null;
  full_name: string;
  organisation?: string | null;
  email: string;
  phone?: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  participants: number;
  extras?: string[] | null;
  invoice_subtotal?: number | null;
  invoice_vat?: number | null;
  invoice_total?: number | null;
  discount_applied?: string | null;
  invoice_breakdown?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export type DocKind = "invoice" | "receipt";

// pdfkit's standard fonts (WinAnsi) have no ₦ glyph, so use "NGN".
function money(n: number | null | undefined): string {
  const v = Number(n || 0);
  return `NGN ${v.toLocaleString("en-NG")}`;
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d.length <= 10 ? d + "T00:00:00" : d).toLocaleDateString("en-NG", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function invoiceNo(b: InvoiceBooking): string {
  return b.invoice_number || `INV-${b.reference.replace(/^CA-/, "")}`;
}

/**
 * Generate a booking PDF as a Buffer.
 * kind="invoice" → pro-forma / payment request.
 * kind="receipt" → paid receipt with PAID marker.
 */
export function generateBookingPdf(b: InvoiceBooking, kind: DocKind = "invoice"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageLeft = 50;
      const pageRight = doc.page.width - 50;
      const contentWidth = pageRight - pageLeft;

      // ── Header band ───────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 110).fill(NOIR);
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(VENUE_NAME, pageLeft, 34);
      doc
        .fillColor(GOLD)
        .font("Helvetica")
        .fontSize(8.5)
        .text(VENUE_ADDRESS, pageLeft, 62, { width: 320 });
      doc
        .fillColor("#cfcfcf")
        .fontSize(8.5)
        .text(`${VENUE_EMAIL}  ·  WhatsApp ${VENUE_WHATSAPP}`, pageLeft, 78);

      const title = kind === "receipt" ? "RECEIPT" : "INVOICE";
      doc
        .fillColor(GOLD)
        .font("Helvetica-Bold")
        .fontSize(24)
        .text(title, pageRight - 160, 40, { width: 160, align: "right" });

      // ── Meta block ────────────────────────────────────────────────
      let y = 132;
      doc.fillColor(MUTED).font("Helvetica").fontSize(9);
      const metaRight = (label: string, value: string, yy: number) => {
        doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(label, pageRight - 240, yy, { width: 110, align: "right" });
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(9).text(value, pageRight - 125, yy, { width: 125, align: "right" });
      };

      // Bill-to (left)
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("BILL TO", pageLeft, y);
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text(b.full_name, pageLeft, y + 13);
      let by = y + 30;
      if (b.organisation) { doc.fillColor(INK).font("Helvetica").fontSize(9).text(b.organisation, pageLeft, by); by += 13; }
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(b.email, pageLeft, by); by += 13;
      if (b.phone) doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(b.phone, pageLeft, by);

      // Meta (right)
      metaRight(kind === "receipt" ? "Receipt No." : "Invoice No.", invoiceNo(b), y);
      metaRight("Booking Ref.", b.reference, y + 15);
      metaRight("Issue Date", fmtDate(b.created_at ? b.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)), y + 30);
      if (kind === "receipt" && b.paid_at) {
        metaRight("Paid On", fmtDate(b.paid_at.slice(0, 10)), y + 45);
      } else {
        metaRight("Status", (b.status || "pending").toUpperCase(), y + 45);
      }

      // ── Booking summary strip ─────────────────────────────────────
      y = 218;
      doc.roundedRect(pageLeft, y, contentWidth, 54, 6).fill("#f5f3ee");
      const dateLabel =
        b.start_date === b.end_date ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`;
      const col = contentWidth / 3;
      const cell = (label: string, value: string, i: number) => {
        const cx = pageLeft + 14 + i * col;
        doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(label.toUpperCase(), cx, y + 11, { width: col - 20 });
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5).text(value, cx, y + 24, { width: col - 20 });
      };
      cell("Event Type", EVENT_TYPE_MAP[b.event_type] || b.event_type, 0);
      cell("Date(s)", dateLabel, 1);
      cell("Time & Guests", `${(b.start_time || "").slice(0, 5)}–${(b.end_time || "").slice(0, 5)} · ${b.participants} pax`, 2);

      // ── Line items table ──────────────────────────────────────────
      y = 294;
      const colDesc = pageLeft + 8;
      const colAmt = pageRight - 8;

      doc.rect(pageLeft, y, contentWidth, 22).fill(NOIR);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      doc.text("DESCRIPTION", colDesc, y + 7);
      doc.text("AMOUNT", pageLeft, y + 7, { width: contentWidth - 8, align: "right" });
      y += 22;

      const subtotal = Number(b.invoice_subtotal || 0);
      const vat = b.invoice_vat != null ? Number(b.invoice_vat) : Math.round((subtotal * VAT_RATE) / 100);
      const total = b.invoice_total != null ? Number(b.invoice_total) : subtotal + vat;

      const desc =
        b.invoice_breakdown ||
        `Venue booking — ${EVENT_TYPE_MAP[b.event_type] || b.event_type}`;

      const drawRow = (label: string, amount: string, opts: { bold?: boolean; sub?: string } = {}) => {
        const rowH = opts.sub ? 34 : 22;
        doc.fillColor(opts.bold ? INK : INK).font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
        doc.text(label, colDesc, y + 6, { width: contentWidth - 130 });
        doc.text(amount, pageLeft, y + 6, { width: contentWidth - 8, align: "right" });
        if (opts.sub) {
          doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(opts.sub, colDesc, y + 20, { width: contentWidth - 130 });
        }
        y += rowH;
        doc.moveTo(pageLeft, y).lineTo(pageRight, y).strokeColor(LINE).lineWidth(0.7).stroke();
      };

      drawRow(desc, money(subtotal), {
        sub: b.discount_applied && b.discount_applied !== "None" ? `Discount applied: ${b.discount_applied}` : undefined,
      });

      if (b.extras && b.extras.length) {
        drawRow(`Optional extras: ${b.extras.join(", ")}`, "Included");
      }

      // ── Totals ────────────────────────────────────────────────────
      y += 8;
      const totalsX = pageRight - 240;
      const totLine = (label: string, value: string, bold = false) => {
        doc.fillColor(bold ? INK : MUTED).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9.5);
        doc.text(label, totalsX, y, { width: 120 });
        doc.fillColor(bold ? NOIR : INK).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9.5);
        doc.text(value, totalsX + 120, y, { width: 120, align: "right" });
        y += bold ? 20 : 16;
      };
      totLine("Subtotal (ex. VAT)", money(subtotal));
      totLine(`VAT (${VAT_RATE}%)`, money(vat));
      doc.moveTo(totalsX, y).lineTo(pageRight, y).strokeColor(NOIR).lineWidth(1).stroke();
      y += 8;
      totLine(kind === "receipt" ? "Amount Paid" : "Total Due", money(total), true);

      // ── PAID marker (receipt) ─────────────────────────────────────
      if (kind === "receipt") {
        doc.save();
        doc.rotate(-12, { origin: [pageLeft + 90, y + 40] });
        doc.roundedRect(pageLeft + 20, y + 18, 150, 46, 6).lineWidth(2.5).strokeColor("#16a34a").stroke();
        doc.fillColor("#16a34a").font("Helvetica-Bold").fontSize(26).text("PAID", pageLeft + 20, y + 28, { width: 150, align: "center" });
        doc.restore();
        if (b.payment_method) {
          doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text(`Payment method: ${b.payment_method}`, totalsX, y + 6, { width: 240, align: "right" });
        }
      }

      // ── Footer ────────────────────────────────────────────────────
      const footY = doc.page.height - 96;
      doc.moveTo(pageLeft, footY).lineTo(pageRight, footY).strokeColor(LINE).lineWidth(0.7).stroke();
      if (kind === "invoice") {
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(9).text("Payment", pageLeft, footY + 10);
        doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text(
          "Complete payment via the secure link sent to your email to confirm this booking. Your slot is soft-reserved for 6 hours.",
          pageLeft, footY + 24, { width: contentWidth }
        );
      }
      doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(
        "Non-refundable: once a booking is confirmed it cannot be cancelled or refunded. Prices are inclusive of VAT where shown.",
        pageLeft, footY + (kind === "invoice" ? 50 : 14), { width: contentWidth }
      );
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8.5).text(
        `Thank you for choosing ${VENUE_NAME}`,
        pageLeft, footY + (kind === "invoice" ? 68 : 32), { width: contentWidth, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
