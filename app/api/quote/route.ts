import { NextResponse } from "next/server";
import {
  canonicalPricingInput,
  getOrCreateQuote,
  getPricingNotes,
  durationHours,
} from "@/lib/pricing";
import {
  MAX_DAYS,
  MAX_DURATION_HOURS,
  MAX_PARTICIPANTS,
} from "@/lib/booking-schema";

/**
 * POST /api/quote
 *
 * Body: { days: [{ date, startTime, endTime }, ...], participants, eventType }
 *
 * Prices a booking *before* the customer commits to it, so the amount is on
 * screen while they are still choosing dates rather than appearing only after
 * they've agreed to pay. Goes through the same `getOrCreateQuote` as
 * `/api/book`, so the number shown here is the number charged there.
 *
 * Each day is priced on its own tier and summed, so a programme whose days
 * differ in length is not billed at the longest day's rate.
 *
 * The client calls this on every change to a pricing field, so an incomplete
 * body is an expected state, not an error — it answers 200 with
 * `{ ok: false, reason: "incomplete" }` rather than a 4xx.
 */

export const runtime = "nodejs"; // uses node crypto for the quote id
export const dynamic = "force-dynamic";

// ─── Rate limiting ────────────────────────────────────────────────────────────
// This endpoint calls a paid LLM on a cache miss. Cached repeats are free, but
// a script walking distinct inputs is not — so cap per IP.

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (buckets.size > 5000) {
      for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Distinguishes "not finished filling the form yet" from "these values are
 * genuinely wrong", so the panel can stay quiet in the first case and explain
 * itself in the second.
 */
function describeInvalid(raw: Record<string, unknown>): string | null {
  if (Array.isArray(raw.days)) {
    if (raw.days.length > MAX_DAYS) {
      return `You can book up to ${MAX_DAYS} days at a time`;
    }
    const seen = new Set<string>();
    for (const entry of raw.days as Record<string, unknown>[]) {
      if (!entry || typeof entry !== "object") continue;
      const date = String(entry.date ?? "");
      if (date && seen.has(date)) return "The same date is listed twice";
      if (date) seen.add(date);

      const startTime = String(entry.startTime ?? "").slice(0, 5);
      const endTime = String(entry.endTime ?? "").slice(0, 5);
      if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) continue;

      const hours = durationHours(startTime, endTime);
      if (hours <= 0) return "End time must be after start time";
      if (hours > MAX_DURATION_HOURS) {
        return `Single days are limited to ${MAX_DURATION_HOURS} hours — please contact us for longer sessions`;
      }
    }
  }

  if (raw.participants !== undefined && raw.participants !== null && raw.participants !== "") {
    const n = Number(raw.participants);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PARTICIPANTS) {
      return `Participants must be a whole number between 1 and ${MAX_PARTICIPANTS}`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429 }
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const input = canonicalPricingInput(raw);

  if (!input) {
    const message = describeInvalid(raw);
    if (message) {
      return NextResponse.json(
        { ok: false, reason: "invalid", message },
        { status: 400 }
      );
    }
    // Just not filled in yet — the client fires as fields are completed.
    return NextResponse.json({ ok: false, reason: "incomplete" });
  }

  try {
    const quote = await getOrCreateQuote(input);
    // The Friday community rate has no published figure and eligibility can't be
    // verified from a form, so it is surfaced as a note rather than applied.
    const notes = quote.hasFriday ? await getPricingNotes() : null;
    return NextResponse.json({
      ok: true,
      ...quote,
      fridayCommunityNote: notes?.fridayCommunityNote,
    });
  } catch (err) {
    console.error("[API/quote] Pricing failed:", err);
    // Degrade rather than hard-error: the form stays usable and the customer is
    // told we'll confirm the amount by email.
    return NextResponse.json({ ok: false, reason: "unavailable" });
  }
}
