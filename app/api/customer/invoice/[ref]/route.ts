import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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
    const rows = await sql`
      SELECT * FROM bookings
      WHERE reference = ${ref}
        AND (customer_id = ${session.id}::uuid OR LOWER(email) = ${session.email})
      LIMIT 1
    `;
    const booking = rows[0] as unknown as InvoiceBooking | undefined;
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Only issue a receipt for paid bookings; otherwise fall back to invoice.
    if (kind === "receipt" && booking.payment_status !== "paid") kind = "invoice";

    const pdf = await generateBookingPdf(booking, kind);
    const filename = `${kind === "receipt" ? "Receipt" : "Invoice"}-${ref}.pdf`;

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

