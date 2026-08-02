import { NextResponse } from "next/server";
import { db, friendlyDbError } from "@/lib/db";
import { customers, bookings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { buildCustomerCookie, normalizeEmail } from "@/lib/customer-auth";

export const runtime = "nodejs";

/**
 * POST /api/customer/register
 * Body: { fullName, email, phone?, password }
 * Creates a customer account using Drizzle's .$returningId() to get the new
 * UUID, links any prior guest bookings, and signs the customer in.
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

    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Use Drizzle's .$returningId() — MySQL-native way to get the generated UUID.
    // The id column has $defaultFn(() => randomUUID()) in the schema, so
    // Drizzle generates the UUID in JS and returns it here.
    const inserted = await db
      .insert(customers)
      .values({ fullName, email, phone, passwordHash })
      .$returningId();

    const customerId = inserted[0].id;

    // Link prior guest bookings made with this email.
    try {
      await db
        .update(bookings)
        .set({ customerId })
        .where(
          sql`${bookings.customerId} IS NULL AND LOWER(${bookings.email}) = ${email}`
        );
    } catch (linkErr) {
      console.error("[customer/register] guest-booking link skipped:", linkErr);
    }

    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", buildCustomerCookie(String(customerId)));
    return res;
  } catch (err) {
    console.error("[customer/register] error:", err);
    const friendly = friendlyDbError(err);
    return NextResponse.json(
      { error: friendly || "Failed to create account. Please try again." },
      { status: friendly ? 400 : 500 }
    );
  }
}
