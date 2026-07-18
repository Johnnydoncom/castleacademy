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

/** GET /api/admin/blocked-slots — returns all blocked slots */
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rows = await sql`
      SELECT id, slot_date::text AS slot_date, start_time::text, end_time::text, reason, created_at
      FROM blocked_slots
      ORDER BY slot_date DESC, start_time
    `;
    return NextResponse.json({ blockedSlots: rows });
  } catch (err) {
    console.error("[admin/blocked-slots] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch blocked slots" }, { status: 500 });
  }
}

/** POST /api/admin/blocked-slots — create a blocked slot */
export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slotDate, startTime, endTime, reason } = await req.json();
    if (!slotDate || !startTime || !endTime) {
      return NextResponse.json({ error: "slotDate, startTime and endTime are required" }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO blocked_slots (slot_date, start_time, end_time, reason)
      VALUES (${slotDate}::date, ${startTime}::time, ${endTime}::time, ${reason ?? null})
      RETURNING id, slot_date::text AS slot_date, start_time::text, end_time::text, reason
    `;
    return NextResponse.json({ success: true, blockedSlot: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[admin/blocked-slots] POST error:", err);
    return NextResponse.json({ error: "Failed to create blocked slot" }, { status: 500 });
  }
}

/** DELETE /api/admin/blocked-slots?id=<uuid> — remove a blocked slot */
export async function DELETE(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await sql`DELETE FROM blocked_slots WHERE id = ${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/blocked-slots] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete blocked slot" }, { status: 500 });
  }
}
