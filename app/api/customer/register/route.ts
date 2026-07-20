import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { buildCustomerCookie, normalizeEmail } from "@/lib/customer-auth";

/**
 * POST /api/customer/register
 * Body: { fullName, email, phone?, password }
 * Creates a customer account, links any prior guest bookings made with the
 * same email, and signs the customer in.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = normalizeEmail(body.email);
    const phone = body.phone ? String(body.phone).trim() : null;
    const password = String(body.password || "");

    if (fullName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM customers WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await sql`
      INSERT INTO customers (full_name, email, phone, password_hash)
      VALUES (${fullName}, ${email}, ${phone}, ${passwordHash})
      RETURNING id
    `;
    const customerId = inserted[0].id as string;

    // Link prior guest bookings made with this email
    await sql`
      UPDATE bookings SET customer_id = ${customerId}::uuid
      WHERE customer_id IS NULL AND LOWER(email) = ${email}
    `;

    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", buildCustomerCookie(customerId));
    return res;
  } catch (err) {
    console.error("[customer/register] error:", err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
