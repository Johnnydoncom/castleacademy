import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, passwordResetTokens } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { friendlyDbError } from "@/lib/db";
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

    const rows = await db
      .select({ id: customers.id, fullName: customers.fullName })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (rows.length > 0) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      // Invalidate previous outstanding tokens, then store the new one.
      await db
        .update(passwordResetTokens)
        .set({ used: 1 })
        .where(
          sql`${passwordResetTokens.customerId} = ${Number(rows[0].id)} AND ${passwordResetTokens.used} = 0`
        );

      await db.insert(passwordResetTokens).values({
        tokenHash,
        customerId: Number(rows[0].id),
        expiresAt: sql`DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
      });

      const link = `${APP_URL}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(email, rows[0].fullName as string, link);
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
