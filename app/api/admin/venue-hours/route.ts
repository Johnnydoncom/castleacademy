import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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
    const rows = await sql`
      SELECT day_of_week, is_open, open_time::text, close_time::text
      FROM venue_hours
      ORDER BY day_of_week
    `;
    return NextResponse.json({ venueHours: rows });
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
      await sql`
        UPDATE venue_hours
        SET
          is_open    = ${h.isOpen},
          open_time  = ${h.openTime}::time,
          close_time = ${h.closeTime}::time,
          updated_at = NOW()
        WHERE day_of_week = ${h.dayOfWeek}
      `;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/venue-hours] PUT error:", err);
    return NextResponse.json({ error: "Failed to update venue hours" }, { status: 500 });
  }
}
