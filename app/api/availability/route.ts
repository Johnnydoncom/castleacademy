import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/availability?date=YYYY-MM-DD
 *
 * Returns venue hours and busy time slots for a given date.
 * A slot is "busy" if:
 *   - It belongs to a CONFIRMED booking, OR
 *   - It belongs to a PENDING booking submitted within the last 6 hours
 *     (6-hour soft-lock to allow offline payment)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "Missing or invalid date param. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    const dayOfWeek = date.getUTCDay(); // 0=Sun … 6=Sat

    // 1. Fetch venue hours for this day of week
    const hoursRows = await sql`
      SELECT is_open, open_time, close_time
      FROM venue_hours
      WHERE day_of_week = ${dayOfWeek}
    `;

    const venueHours = hoursRows[0] ?? {
      is_open: false,
      open_time: "09:00",
      close_time: "18:00",
    };

    // 2. Fetch busy booking slots for this date (confirmed OR pending within 6h)
    const bookingSlots = await sql`
      SELECT
        start_time::text AS start_time,
        end_time::text   AS end_time,
        NULL             AS reason
      FROM bookings
      WHERE status = 'confirmed'
        AND start_date <= ${dateParam}::date
        AND end_date   >= ${dateParam}::date
      UNION ALL
      SELECT
        start_time::text,
        end_time::text,
        NULL
      FROM bookings
      WHERE status = 'pending'
        AND created_at > NOW() - INTERVAL '6 hours'
        AND start_date <= ${dateParam}::date
        AND end_date   >= ${dateParam}::date
    `;

    // 3. Fetch admin-blocked slots for this date
    const blockedSlots = await sql`
      SELECT
        start_time::text AS start_time,
        end_time::text   AS end_time,
        reason
      FROM blocked_slots
      WHERE slot_date = ${dateParam}::date
      ORDER BY start_time
    `;

    const busySlots = [
      ...bookingSlots.map((r) => ({
        startTime: r.start_time.slice(0, 5),
        endTime: r.end_time.slice(0, 5),
        reason: r.reason ?? undefined,
      })),
      ...blockedSlots.map((r) => ({
        startTime: r.start_time.slice(0, 5),
        endTime: r.end_time.slice(0, 5),
        reason: r.reason ?? undefined,
      })),
    ];

    return NextResponse.json({
      date: dateParam,
      venueHours: {
        isOpen: venueHours.is_open,
        openTime: String(venueHours.open_time).slice(0, 5),
        closeTime: String(venueHours.close_time).slice(0, 5),
      },
      busySlots,
    });
  } catch (err) {
    console.error("[API/availability] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
