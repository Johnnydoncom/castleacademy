import { NextResponse } from "next/server";
import { signToken, clearSessionCookie } from "@/lib/auth";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * POST /api/admin/auth
 * Validates username + password and sets an HttpOnly session cookie.
 */
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const rows = await sql`SELECT id, password_hash FROM admins WHERE username = ${username} LIMIT 1`;
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);

    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken(`admin:${admin.id}:${Date.now()}`);

    const response = NextResponse.json({ success: true });
    response.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`
    );
    return response;
  } catch (err) {
    console.error("[admin/auth] POST error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/auth
 * Clears the session cookie (logout).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
