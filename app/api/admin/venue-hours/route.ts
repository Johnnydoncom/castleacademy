import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { venueHours } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { isOwner } from "@/lib/auth";

// Venue hours are an owner-only setting.
async function checkAuth() {
  return isOwner();
}

/** GET /api/admin/venue-hours — returns all 7 days */
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rows = await db
      .select({
        day_of_week: venueHours.dayOfWeek,
        is_open: venueHours.isOpen,
        open_time: venueHours.openTime,
        close_time: venueHours.closeTime,
      })
      .from(venueHours)
      .orderBy(asc(venueHours.dayOfWeek));

    // Format times to HH:mm in JS (previously done by TIME_FORMAT in SQL)
    const formatted = rows.map((r) => ({
      ...r,
      open_time: String(r.open_time).slice(0, 5),
      close_time: String(r.close_time).slice(0, 5),
    }));
    return NextResponse.json({ venueHours: formatted });
  } catch (err) {
    console.error("[admin/venue-hours] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch venue hours" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/venue-hours
 * Updates one or more days.
 * Body: Array<{ dayOfWeek: number, isOpen: boolean, openTime: string, closeTime: string }>
 */
export async function PUT(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { hours } = await req.json();
    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: "Body must be { hours: [...] }" }, { status: 400 });
    }
    for (const h of hours) {
      await db
        .update(venueHours)
        .set({
          isOpen: h.isOpen ? 1 : 0,
          openTime: h.openTime,
          closeTime: h.closeTime,
          updatedAt: sql`NOW()`,
        })
        .where(eq(venueHours.dayOfWeek, h.dayOfWeek));
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/venue-hours] PUT error:", err);
    return NextResponse.json({ error: "Failed to update venue hours" }, { status: 500 });
  }
}
