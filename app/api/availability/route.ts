import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { venueHours, venueSettings, bookingDays, bookings, blockedSlots } from "@/lib/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";

/**
 * GET /api/availability
 *
 * Three modes:
 *   ?date=YYYY-MM-DD    single day  → { date, venueHours, busySlots, weeklyHours }
 *   ?from=&to=          date range  → { from, to, days: [...], weeklyHours }
 *   ?dates=a,b,c        exact days  → { days: [...], weeklyHours }
 *   ?weekly=1           hours only  → { weeklyHours }
 *
 * A slot is "busy" if it belongs to a CONFIRMED booking, to a PENDING booking
 * created within the last 6 hours (the soft-lock that lets people pay offline),
 * or to an admin-blocked slot.
 *
 * The range and dates modes exist because there is exactly one room: a Mon–Wed
 * booking has to be checked against Tuesday and Wednesday too, which the
 * single-day mode could never express. `?dates=` handles non-consecutive
 * selections ("every Tuesday") without pulling the whole intervening span. The
 * weekly mode lets the calendar grey out closed days before any date is picked.
 *
 * Every response carries `turnaroundMinutes` — the gap required between two
 * different bookings on the same day. Busy slots are returned RAW; callers pad
 * them by the turnaround themselves, so admin screens can still show the real
 * booked hours.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 31;

const DEFAULT_HOURS = { isOpen: false, openTime: "09:00", closeTime: "18:00" };

interface BusySlot {
  startTime: string;
  endTime: string;
  reason?: string;
}

/**
 * Day of week for a "YYYY-MM-DD" string, computed from the parts rather than by
 * parsing. `new Date("2026-08-12").getUTCDay()` happens to be right for Lagos
 * (UTC+1, no DST) but only by accident of the offset's sign.
 */
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  );
}

function hhmm(v: unknown): string {
  return String(v).slice(0, 5);
}

async function fetchTurnaroundMinutes(): Promise<number> {
  try {
    const rows = await db
      .select({ value: venueSettings.value })
      .from(venueSettings)
      .where(eq(venueSettings.key, "turnaround_minutes"));
    const n = Number(rows[0]?.value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    // venue_settings arrives with migration 008; absent it, no buffer.
    return 0;
  }
}

async function fetchWeeklyHours() {
  const rows = await db
    .select({
      dayOfWeek: venueHours.dayOfWeek,
      isOpen: venueHours.isOpen,
      openTime: venueHours.openTime,
      closeTime: venueHours.closeTime,
    })
    .from(venueHours);

  const byDow = new Map(rows.map((r) => [Number(r.dayOfWeek), r]));
  return Array.from({ length: 7 }, (_, dow) => {
    const row = byDow.get(dow);
    return {
      dayOfWeek: dow,
      isOpen: row ? Boolean(row.isOpen) : DEFAULT_HOURS.isOpen,
      openTime: row ? hhmm(row.openTime) : DEFAULT_HOURS.openTime,
      closeTime: row ? hhmm(row.closeTime) : DEFAULT_HOURS.closeTime,
    };
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const datesParam = searchParams.get("dates");
    const weeklyOnly = searchParams.get("weekly");

    // ── Weekly hours only ────────────────────────────────────────────────────
    if (weeklyOnly && !dateParam && !fromParam && !datesParam) {
      return NextResponse.json({
        weeklyHours: await fetchWeeklyHours(),
        turnaroundMinutes: await fetchTurnaroundMinutes(),
      });
    }

    // ── Resolve which dates were asked for ───────────────────────────────────
    let dates: string[];

    if (datesParam) {
      dates = [...new Set(datesParam.split(",").map((d) => d.trim()).filter(Boolean))].sort();
      if (dates.length === 0 || dates.some((d) => !DATE_RE.test(d))) {
        return NextResponse.json(
          { error: "Invalid dates param. Expected comma-separated YYYY-MM-DD." },
          { status: 400 }
        );
      }
      if (dates.length > MAX_RANGE_DAYS) {
        return NextResponse.json(
          { error: `Too many dates. Maximum ${MAX_RANGE_DAYS}.` },
          { status: 400 }
        );
      }
    } else if (fromParam || toParam) {
      if (!fromParam || !DATE_RE.test(fromParam) || !toParam || !DATE_RE.test(toParam)) {
        return NextResponse.json(
          { error: "Invalid from/to params. Expected YYYY-MM-DD." },
          { status: 400 }
        );
      }
      const span = diffDays(fromParam, toParam);
      if (span < 0) {
        return NextResponse.json({ error: "`to` must not precede `from`." }, { status: 400 });
      }
      if (span + 1 > MAX_RANGE_DAYS) {
        return NextResponse.json(
          { error: `Range too long. Maximum ${MAX_RANGE_DAYS} days.` },
          { status: 400 }
        );
      }
      dates = Array.from({ length: span + 1 }, (_, i) => addDays(fromParam, i));
    } else if (dateParam && DATE_RE.test(dateParam)) {
      dates = [dateParam];
    } else {
      return NextResponse.json(
        { error: "Missing or invalid date param. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // ── Busy slots for exactly those dates ───────────────────────────────────
    // Reads booking_days, the source of truth for scheduling — a booking may
    // run different hours on each of its days, so the parent row's summary
    // columns cannot answer this.
    const [weeklyHours, turnaroundMinutes, bookingSlotRows, blockedSlotRows] =
      await Promise.all([
        fetchWeeklyHours(),
        fetchTurnaroundMinutes(),
        db
          .select({
            day_date: bookingDays.dayDate,
            start_time: bookingDays.startTime,
            end_time: bookingDays.endTime,
          })
          .from(bookingDays)
          .innerJoin(bookings, eq(bookings.id, bookingDays.bookingId))
          .where(
            and(
              inArray(bookingDays.dayDate, dates as any),
              or(
                eq(bookings.status, "confirmed"),
                and(
                  eq(bookings.status, "pending"),
                  sql`${bookings.createdAt} > DATE_SUB(NOW(), INTERVAL 6 HOUR)`
                )
              )
            )
          ),
        db
          .select({
            slot_date: blockedSlots.slotDate,
            start_time: blockedSlots.startTime,
            end_time: blockedSlots.endTime,
            reason: blockedSlots.reason,
          })
          .from(blockedSlots)
          .where(inArray(blockedSlots.slotDate, dates as any))
          .orderBy(blockedSlots.startTime),
      ]);

    const buckets = new Map<string, BusySlot[]>();
    for (const d of dates) buckets.set(d, []);

    for (const b of bookingSlotRows) {
      const dateKey = String(b.day_date).slice(0, 10);
      buckets.get(dateKey)?.push({
        startTime: hhmm(b.start_time),
        endTime: hhmm(b.end_time),
      });
    }

    for (const s of blockedSlotRows) {
      const dateKey = String(s.slot_date).slice(0, 10);
      buckets.get(dateKey)?.push({
        startTime: hhmm(s.start_time),
        endTime: hhmm(s.end_time),
        reason: (s.reason as string) ?? undefined,
      });
    }

    const days = Array.from(buckets, ([date, busySlots]) => {
      const h = weeklyHours[dayOfWeek(date)];
      return {
        date,
        venueHours: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        busySlots: busySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      };
    });

    // Single-day mode keeps its original response shape — the extra fields are
    // additive, so existing callers are unaffected.
    if (dateParam && !fromParam && !datesParam) {
      return NextResponse.json({
        date: days[0].date,
        venueHours: days[0].venueHours,
        busySlots: days[0].busySlots,
        weeklyHours,
        turnaroundMinutes,
      });
    }

    return NextResponse.json({
      from: dates[0],
      to: dates[dates.length - 1],
      days,
      weeklyHours,
      turnaroundMinutes,
    });
  } catch (err) {
    console.error("[API/availability] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
