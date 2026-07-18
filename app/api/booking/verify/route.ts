import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyTransaction } from "@/lib/nomba";

/**
 * POST /api/booking/verify
 * Called by the /booking/callback page to actively verify payment status.
 * This is the primary escape hatch: if the Nomba webhook is delayed/missed,
 * the callback page calls this endpoint which polls Nomba directly and
 * confirms the booking if the payment succeeded.
 *
 * Body: { ref: "CA-YYYYMMDD-XXXXXX" }
 */
export async function POST(req: Request) {
  try {
    const { ref } = await req.json();

    if (!ref || !/^CA-\d{8}-[A-F0-9]{6}$/.test(ref)) {
      return NextResponse.json({ error: "Invalid booking reference" }, { status: 400 });
    }

    // 1. Fetch booking with payment details
    const rows = await sql`
      SELECT
        id, reference, email, full_name,
        start_date::text, end_date::text,
        start_time::text, end_time::text,
        status, payment_status, invoice_total,
        nomba_order_ref, nomba_transaction_id, checkout_link
      FROM bookings
      WHERE reference = ${ref}
      LIMIT 1
    `;

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
      const verification = await verifyTransaction(orderRef, txId);
      console.log(`[api/booking/verify] Nomba verify for ${ref}: success=${verification.success}, status=${verification.statusCode}`);

      if (verification.success) {
        paymentConfirmed = true;
        paymentMethod = verification.paymentMethod || "card";
      }
    } catch (verifyErr) {
      console.warn(`[api/booking/verify] Verify threw for ${ref}:`, verifyErr);
      // On sandbox, don't fail — the webhook may have already fired
    }

    // 4. If sandbox and webhook has already confirmed it, re-fetch
    if (isSandbox && !paymentConfirmed) {
      const recheck = await sql`
        SELECT status, payment_status FROM bookings WHERE reference = ${ref} LIMIT 1
      `;
      if (recheck[0]?.payment_status === "paid") {
        return NextResponse.json({ status: "confirmed", paymentStatus: "paid", reference: ref });
      }
    }

    // 5. If confirmed, update the DB
    if (paymentConfirmed) {
      await sql`
        UPDATE bookings SET
          status               = 'confirmed',
          payment_status       = 'paid',
          payment_method       = ${paymentMethod},
          paid_at              = NOW(),
          updated_at           = NOW()
        WHERE reference = ${ref}
      `;

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
