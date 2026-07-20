import { NextResponse } from "next/server";
import { sql, friendlyDbError } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { buildCustomerCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

/**
 * POST /api/customer/password/reset  — Body: { token, password }
 * Validates the reset token, updates the password, marks the token used,
 * and signs the customer in.
 */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid or missing reset token." }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await sql`
      SELECT customer_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND used = false AND expires_at > NOW()
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const customerId = rows[0].customer_id as string;
    const passwordHash = await bcrypt.hash(String(password), 10);

    await sql`UPDATE customers SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${customerId}::uuid`;
    // Consume every outstanding token for this customer.
    await sql`UPDATE password_reset_tokens SET used = true WHERE customer_id = ${customerId}::uuid`;

    // Sign the customer in for a smooth hand-off to the dashboard.
    const res = NextResponse.json({ success: true, message: "Password updated. You're now signed in." });
    res.headers.append("Set-Cookie", buildCustomerCookie(customerId));
    return res;
  } catch (err) {
    console.error("[password/reset] error:", err);
    const friendly = friendlyDbError(err);
    return NextResponse.json(
      { error: friendly || "Could not reset the password. Please try again." },
      { status: friendly ? 400 : 500 }
    );
  }
}
