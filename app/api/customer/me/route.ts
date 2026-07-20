import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getCustomerSession } from "@/lib/customer-auth";

/** GET /api/customer/me — current customer profile */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: session.id,
    fullName: session.full_name,
    email: session.email,
    phone: session.phone,
  });
}

/**
 * PATCH /api/customer/me
 * Body: { fullName?, phone?, currentPassword?, newPassword? }
 * Updates profile fields and (optionally) the password.
 */
export async function PATCH(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const fullName = body.fullName != null ? String(body.fullName).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : null;

    if (fullName !== null && fullName.length < 2) {
      return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
    }

    // Password change (optional) — requires current password
    if (body.newPassword) {
      if (String(body.newPassword).length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
      }
      const rows = await sql`SELECT password_hash FROM customers WHERE id = ${session.id}::uuid LIMIT 1`;
      const ok = rows.length > 0 && (await bcrypt.compare(String(body.currentPassword || ""), rows[0].password_hash));
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      const newHash = await bcrypt.hash(String(body.newPassword), 10);
      await sql`UPDATE customers SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.id}::uuid`;
    }

    await sql`
      UPDATE customers SET
        full_name  = COALESCE(${fullName}, full_name),
        phone      = COALESCE(${phone}, phone),
        updated_at = NOW()
      WHERE id = ${session.id}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[customer/me] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
