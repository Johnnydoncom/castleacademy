import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function checkAuth() {
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  if (!token) return false;
  return verifyToken(token) !== null;
}

export async function DELETE() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all bookings. (Admin records, blocked slots, and settings remain untouched)
    await sql`DELETE FROM bookings`;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API reset-bookings] error:", err);
    return NextResponse.json({ error: "Failed to reset bookings" }, { status: 500 });
  }
}
