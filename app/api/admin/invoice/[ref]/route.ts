import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { generateBookingPdf, type InvoiceBooking, type DocKind } from "@/lib/invoice";

export const runtime = "nodejs";

const REF_RE = /^CA-\d{8}-[A-F0-9]{6}$/;

/**
 * GET /api/admin/invoice/[ref]?type=invoice|receipt
 * Streams a booking PDF for any booking (admin-only).
 */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ref } = await params;
  if (!REF_RE.test(ref)) return NextResponse.json({ error: "Invalid reference" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  let kind = (searchParams.get("type") as DocKind) || "invoice";

  const rows = await sql`SELECT * FROM bookings WHERE reference = ${ref} LIMIT 1`;
  const booking = rows[0] as unknown as InvoiceBooking | undefined;
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

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
}
