import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, bookingDays } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";
import { generateBookingPdf, type InvoiceBooking, type DocKind } from "@/lib/invoice";

export const runtime = "nodejs";

const REF_RE = /^CA-\d{8}-[A-F0-9]{6}$/;

/**
 * GET /api/customer/invoice/[ref]?type=invoice|receipt
 * Streams a PDF for a booking the signed-in customer owns.
 * "receipt" is only allowed once the booking is paid.
 */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ref } = await params;
  if (!REF_RE.test(ref)) return NextResponse.json({ error: "Invalid reference" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  let kind = (searchParams.get("type") as DocKind) || "invoice";

  try {
    const rows = await db
      .select()
      .from(bookings)
      .where(
        sql`${bookings.reference} = ${ref} AND (${bookings.customerId} = ${session.id} OR LOWER(${bookings.email}) = ${session.email})`
      )
      .limit(1);

    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Map Drizzle camelCase properties → InvoiceBooking snake_case interface.
    const booking: InvoiceBooking = {
      id: String(row.id),
      reference: row.reference,
      invoice_number: row.invoiceNumber ?? null,
      full_name: row.fullName as string,
      organisation: (row.organisation as string) ?? null,
      email: row.email as string,
      phone: (row.phone as string) ?? null,
      event_type: row.eventType as string,
      start_date: String(row.startDate),
      end_date: String(row.endDate),
      start_time: row.startTime as string,
      end_time: row.endTime as string,
      participants: row.participants,
      status: row.status,
      payment_status: row.paymentStatus,
      payment_method: row.paymentMethod ?? null,
      invoice_subtotal: row.invoiceSubtotal ?? null,
      invoice_vat: row.invoiceVat ?? null,
      invoice_total: row.invoiceTotal ?? null,
      invoice_breakdown: (row.invoiceBreakdown as string) ?? null,
      discount_applied: (row.discountApplied as string) ?? null,
      extras: (row.extras as string[]) ?? null,
      paid_at: row.paidAt ? String(row.paidAt) : null,
    };

    // Only issue a receipt for paid bookings; otherwise fall back to invoice.
    if (kind === "receipt" && booking.payment_status !== "paid") kind = "invoice";

    // Per-day schedule so the document lists each day's real hours.
    const dayRows = await db
      .select({
        date: bookingDays.dayDate,
        start_time: bookingDays.startTime,
        end_time: bookingDays.endTime,
      })
      .from(bookingDays)
      .where(eq(bookingDays.bookingId, row.id))
      .orderBy(asc(bookingDays.dayDate));

    booking.days = dayRows.map((r: any) => ({
      date: String(r.date).slice(0, 10),
      start_time: String(r.start_time).slice(0, 5),
      end_time: String(r.end_time).slice(0, 5),
    })) as InvoiceBooking["days"];

    const pdf = await generateBookingPdf(booking, kind);
    const filename = kind === "receipt"
      ? `Receipt-${ref}.pdf`
      : `Invoice-${ref}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(`[customer/invoice/${ref}] PDF generation failed:`, err);
    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again or contact support." },
      { status: 500 }
    );
  }
}
