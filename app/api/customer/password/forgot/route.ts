import { NextResponse } from "next/server";
import { sql, friendlyDbError } from "@/lib/db";
import { randomBytes, createHash } from "crypto";
import { normalizeEmail } from "@/lib/customer-auth";
import { sendPasswordResetEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const APP_URL = process.env.APP_URL || "https://thecastleacademy.com";

/**
 * POST /api/customer/password/forgot  — Body: { email }
 * Always responds success (no account enumeration). If the email maps to a
 * customer, a one-hour reset token is created and emailed.
 */
export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();
    const email = normalizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }

    const rows = await sql`SELECT id, full_name FROM customers WHERE email = ${email} LIMIT 1`;

    if (rows.length > 0) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      // Invalidate previous outstanding tokens, then store the new one.
      await sql`UPDATE password_reset_tokens SET used = true WHERE customer_id = ${rows[0].id}::uuid AND used = false`;
      await sql`
        INSERT INTO password_reset_tokens (token_hash, customer_id, expires_at)
        VALUES (${tokenHash}, ${rows[0].id}::uuid, NOW() + INTERVAL '1 hour')
      `;

      const link = `${APP_URL}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(email, rows[0].full_name, link);
      } catch (mailErr) {
        console.error("[password/forgot] email send failed:", mailErr);
      }
    }

    // Uniform response regardless of whether the account exists.
    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, we've sent a reset link.",
    });
  } catch (err) {
    console.error("[password/forgot] error:", err);
    const friendly = friendlyDbError(err);
    return NextResponse.json(
      { error: friendly || "Could not process the request. Please try again." },
      { status: friendly ? 400 : 500 }
    );
  }
}
