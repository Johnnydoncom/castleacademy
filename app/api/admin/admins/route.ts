import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isOwner } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Admin-account management is owner-only.
async function checkAuth() {
  return isOwner();
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT id, username, role, created_at
      FROM admins
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ admins: rows });
  } catch (err) {
    console.error("[admin/admins] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password } = await req.json();

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if user exists
    const existing = await sql`SELECT id FROM admins WHERE username = ${username} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO admins (username, password_hash)
      VALUES (${username}, ${hash})
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/admins] POST error:", err);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing admin id" }, { status: 400 });
    }

    // Prevent deleting the default admin
    const admin = await sql`SELECT username, role FROM admins WHERE id = ${id}::uuid LIMIT 1`;
    if (admin.length > 0 && (admin[0].username === "castacadmin" || admin[0].role === "owner")) {
      return NextResponse.json({ error: "Cannot delete the owner account" }, { status: 403 });
    }

    await sql`DELETE FROM admins WHERE id = ${id}::uuid`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/admins] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}
