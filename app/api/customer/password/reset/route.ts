import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, passwordResetTokens } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { friendlyDbError } from "@/lib/db";
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

    const rows = await db
      .select({ customerId: passwordResetTokens.customerId })
      .from(passwordResetTokens)
      .where(
        sql`${passwordResetTokens.tokenHash} = ${tokenHash} AND ${passwordResetTokens.used} = 0 AND ${passwordResetTokens.expiresAt} > NOW()`
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const customerId = rows[0].customerId;
    const passwordHash = await bcrypt.hash(String(password), 10);

    await db
      .update(customers)
      .set({ passwordHash, updatedAt: sql`NOW()` })
      .where(eq(customers.id, Number(customerId)));

    // Consume every outstanding token for this customer.
    await db
      .update(passwordResetTokens)
      .set({ used: 1 })
      .where(eq(passwordResetTokens.customerId, Number(customerId)));

    // Sign the customer in for a smooth hand-off to the dashboard.
    const res = NextResponse.json({ success: true, message: "Password updated. You're now signed in." });
    res.headers.append("Set-Cookie", buildCustomerCookie(String(customerId)));
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
