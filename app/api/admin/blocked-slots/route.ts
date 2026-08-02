import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blockedSlots } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
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
    const rows = await db
      .select()
      .from(blockedSlots)
      .orderBy(desc(blockedSlots.slotDate), asc(blockedSlots.startTime));

    // Format dates/times in JS (previously done by DATE_FORMAT / TIME_FORMAT in SQL)
    const formatted = rows.map((r) => ({
      id: r.id,
      slot_date: String(r.slotDate).slice(0, 10),
      start_time: String(r.startTime).slice(0, 5),
      end_time: String(r.endTime).slice(0, 5),
      reason: r.reason,
      created_at: r.createdAt,
    }));
    return NextResponse.json({ blockedSlots: formatted });
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
    await db.insert(blockedSlots).values({
      slotDate,
      startTime,
      endTime,
      reason: reason ?? null,
    });

    const rows = await db
      .select()
      .from(blockedSlots)
      .where(eq(blockedSlots.slotDate, slotDate))
      .orderBy(desc(blockedSlots.id))
      .limit(1);

    const slot = rows[0];
    return NextResponse.json({
      success: true,
      blockedSlot: {
        id: slot.id,
        slot_date: String(slot.slotDate).slice(0, 10),
        start_time: String(slot.startTime).slice(0, 5),
        end_time: String(slot.endTime).slice(0, 5),
        reason: slot.reason,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/blocked-slots] POST error:", err);
    return NextResponse.json({ error: "Failed to create blocked slot" }, { status: 500 });
  }
}

/** DELETE /api/admin/blocked-slots?id=<id> — remove a blocked slot */
export async function DELETE(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(blockedSlots).where(eq(blockedSlots.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/blocked-slots] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete blocked slot" }, { status: 500 });
  }
}
