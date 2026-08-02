import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyTransaction } from "@/lib/nomba";

/**
 * POST /api/booking/verify
 * Called by the /booking/callback page to actively verify payment status.
 * Body: { ref: "CA-YYYYMMDD-XXXXXX" }
 */
export async function POST(req: Request) {
  try {
    const { ref } = await req.json();

    if (!ref || !/^CA-\d{8}-[A-F0-9]{6}$/.test(ref)) {
      return NextResponse.json({ error: "Invalid booking reference" }, { status: 400 });
    }

    // 1. Fetch booking with payment details
    const rows = await db
      .select({
        id: bookings.id,
        reference: bookings.reference,
        email: bookings.email,
        full_name: bookings.fullName,
        start_date: bookings.startDate,
        end_date: bookings.endDate,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
        payment_status: bookings.paymentStatus,
        invoice_total: bookings.invoiceTotal,
        nomba_order_ref: bookings.nombaOrderRef,
        nomba_transaction_id: bookings.nombaTransactionId,
        checkout_link: bookings.checkoutLink,
      })
      .from(bookings)
      .where(eq(bookings.reference, ref))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rows[0];

    // 2. Already confirmed — return immediately
    if (booking.payment_status === "paid" && booking.status === "confirmed") {
      return NextResponse.json({
        status: "confirmed",
        paymentStatus: "paid",
        reference: booking.reference,
      });
    }

    // 3. Try to verify with Nomba directly
    const orderRef = booking.nomba_order_ref || booking.reference;
    const txId = booking.nomba_transaction_id || undefined;

    const isSandbox = (process.env.NOMBA_BASE_URL || "").includes("sandbox");
    let paymentConfirmed = false;
    let paymentMethod = "card";

    try {
      const verification = await verifyTransaction(orderRef as string, txId as string | undefined);
      console.log(`[api/booking/verify] Nomba verify for ${ref}: success=${verification.success}, status=${verification.statusCode}`);

      if (verification.success) {
        paymentConfirmed = true;
        paymentMethod = verification.paymentMethod || "card";
      }
    } catch (verifyErr) {
      console.warn(`[api/booking/verify] Verify threw for ${ref}:`, verifyErr);
    }

    // 4. If sandbox and webhook has already confirmed it, re-fetch
    if (isSandbox && !paymentConfirmed) {
      const recheck = await db
        .select({ status: bookings.status, payment_status: bookings.paymentStatus })
        .from(bookings)
        .where(eq(bookings.reference, ref))
        .limit(1);
      if (recheck[0]?.payment_status === "paid") {
        return NextResponse.json({ status: "confirmed", paymentStatus: "paid", reference: ref });
      }
    }

    // 5. If confirmed, update the DB
    if (paymentConfirmed) {
      await db
        .update(bookings)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          paymentMethod,
          paidAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(bookings.reference, ref));

      console.log(`[api/booking/verify] ✅ Booking ${ref} confirmed via active verify`);

      return NextResponse.json({
        status: "confirmed",
        paymentStatus: "paid",
        reference: ref,
      });
    }

    // 6. Still pending — tell the client to keep polling
    return NextResponse.json({
      status: booking.status,
      paymentStatus: booking.payment_status,
      reference: ref,
      checkoutLink: booking.checkout_link,
    });

  } catch (err) {
    console.error("[api/booking/verify] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
