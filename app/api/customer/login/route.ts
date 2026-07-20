import { NextResponse } from "next/server";
import { sql, friendlyDbError } from "@/lib/db";
import bcrypt from "bcryptjs";
import { buildCustomerCookie, buildClearCustomerCookie, normalizeEmail } from "@/lib/customer-auth";

export const runtime = "nodejs";

/**
 * POST /api/customer/login  — Body: { email, password }
 * DELETE /api/customer/login — logout
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, password_hash FROM customers WHERE email = ${email} LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Opportunistically link any guest bookings for this email (non-fatal)
    try {
      await sql`
        UPDATE bookings SET customer_id = ${rows[0].id}::uuid
        WHERE customer_id IS NULL AND LOWER(email) = ${email}
      `;
    } catch (linkErr) {
      console.error("[customer/login] guest-booking link skipped:", linkErr);
    }

    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", buildCustomerCookie(rows[0].id));
    return res;
  } catch (err) {
    console.error("[customer/login] error:", err);
    const friendly = friendlyDbError(err);
    return NextResponse.json(
      { error: friendly || "Login failed. Please try again." },
      { status: friendly ? 400 : 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", buildClearCustomerCookie());
  return res;
}
