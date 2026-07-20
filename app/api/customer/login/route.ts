import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { buildCustomerCookie, buildClearCustomerCookie, normalizeEmail } from "@/lib/customer-auth";

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

    // Opportunistically link any guest bookings for this email
    await sql`
      UPDATE bookings SET customer_id = ${rows[0].id}::uuid
      WHERE customer_id IS NULL AND LOWER(email) = ${email}
    `;

    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", buildCustomerCookie(rows[0].id));
    return res;
  } catch (err) {
    console.error("[customer/login] error:", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", buildClearCustomerCookie());
  return res;
}
