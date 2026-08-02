import { createHash } from "crypto";
import {
  areConsecutive,
  MAX_DAYS,
  MAX_PARTICIPANTS,
  MAX_DURATION_HOURS,
  sortDays,
  type DaySchedule,
} from "./booking-schema";
import { loadPricingConfig } from "./pricing-config-store";
import { type PricingConfig } from "./pricing-config";

/**
 * The pricing engine. Server-only.
 *
 * `/api/quote` and `/api/book` both price through `getOrCreateQuote`, which is
 * what makes "the quoted price is the charged price" true rather than merely
 * likely.
 *
 * Fully deterministic. Prices were previously produced by an LLM reading
 * `pricing-rules.txt` as a prompt; that was removed because it was demonstrably
 * wrong — it applied the Monday Special to Wednesdays (₦85,000 instead of
 * ₦100,000) and attached unexplained discounts to non-consecutive days. Every
 * rule that can be computed from a booking now lives in `pricing_config`, which
 * the owner edits at /admin/pricing.
 *
 * Rules that a booking form cannot decide — the Friday community rate (no
 * published figure, eligibility unverifiable), loyalty, corporate membership,
 * referral credit — are surfaced as notes and applied by hand.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Fallback VAT rate. The live rate comes from `pricing_config`; this is only
 * used by callers that report a rate before a quote exists.
 */
export const VAT_RATE = parseFloat(process.env.VAT_RATE || "7.5");


// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Everything — and only what — can move the price.
 *
 * `extras` is absent: add-on rates are empty in the pricing config, so extras
 * are quoted separately rather than silently priced at zero.
 *
 * `eventType` is absent too — nothing in the price list varies by it, and
 * including it delayed the live quote until the customer had reached step 2,
 * breaking the panel's promise that a price appears as soon as dates and times
 * are chosen.
 */
export interface PricingInput {
  /** One entry per booked day, each with its own hours. Always sorted by date. */
  days: DaySchedule[];
  participants: number;
}

export interface QuoteLine {
  label: string;
  /** `null` means "quoted separately" — render a note, not an amount. */
  amount: number | null;
  tone?: "default" | "discount" | "muted";
}

export interface PricingResult {
  quoteId: string;
  /** Always "deterministic" — kept so stored quotes from before remain readable. */
  source: "ai" | "deterministic";
  /** Total booked hours across every day. */
  hours: number;
  /** Number of booked days. */
  days: number;
  lines: QuoteLine[];
  baseSubtotal: number; // pre-discount, pre-VAT
  discountAmount: number;
  discountApplied: string;
  subtotal: number; // post-discount, pre-VAT → bookings.invoice_subtotal
  breakdown: string; // → bookings.invoice_breakdown
  vatRate: number;
  vatAmount: number; // → bookings.invoice_vat
  total: number; // → bookings.invoice_total; the amount actually charged
  extrasPriced: boolean;
  /** True when any booked day is a Friday, so the community-rate note shows. */
  hasFriday?: boolean;
}

export type BarePricing = Omit<PricingResult, "quoteId" | "source">;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Duration of a single day's session, in hours. Assumes end > start. */
export function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** Inclusive day count between two "YYYY-MM-DD" strings. */
export function dayCount(startDate: string, endDate: string): number {
  const a = Date.parse(`${startDate}T00:00:00Z`);
  const b = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

export function applyVat(
  subtotal: number,
  vatRate: number = VAT_RATE
): { vatAmount: number; total: number } {
  const vatAmount = Math.round((subtotal * vatRate) / 100);
  return { vatAmount, total: subtotal + vatAmount };
}

/** Calendar days between today (Africa/Lagos, UTC+1 no DST) and a date string. */
function daysUntil(startDate: string): number {
  const now = new Date();
  const lagosNow = new Date(now.getTime() + (60 + now.getTimezoneOffset()) * 60_000);
  const today = Date.UTC(
    lagosNow.getFullYear(),
    lagosNow.getMonth(),
    lagosNow.getDate()
  );
  return Math.round((Date.parse(`${startDate}T00:00:00Z`) - today) / 86_400_000);
}

/**
 * Narrow untrusted input to a `PricingInput`, or `null` if it isn't one.
 * Key order in the returned object is fixed — it is part of the cache-key
 * contract, since the id is a hash of the serialised input.
 */
export function canonicalPricingInput(raw: unknown): PricingInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const participants = Number(r.participants);
  if (!Number.isInteger(participants)) return null;
  if (participants < 1 || participants > MAX_PARTICIPANTS) return null;

  if (!Array.isArray(r.days) || r.days.length < 1 || r.days.length > MAX_DAYS) {
    return null;
  }

  const days: DaySchedule[] = [];
  const seen = new Set<string>();

  for (const entry of r.days as unknown[]) {
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    const date = String(e.date ?? "");
    const startTime = String(e.startTime ?? "").slice(0, 5);
    const endTime = String(e.endTime ?? "").slice(0, 5);

    if (!DATE_RE.test(date) || seen.has(date)) return null;
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return null;

    const hours = durationHours(startTime, endTime);
    if (hours <= 0 || hours > MAX_DURATION_HOURS) return null;

    seen.add(date);
    days.push({ date, startTime, endTime });
  }

  // Sorted so that the same set of days always hashes to the same quote id,
  // whatever order the client sent them in.
  return { days: sortDays(days), participants };
}

/** Weekday index for a "YYYY-MM-DD" string. 0 = Sunday, 1 = Monday. */
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Standard package tier for a duration, ignoring weekday specials. */
function standardTier(
  hours: number,
  cfg: PricingConfig
): { price: number; label: string } {
  const p = cfg.packages;
  if (hours <= 3) return { price: p.hours3, label: "3 Hours" };
  if (hours <= 4) return { price: p.halfDay, label: "Half Day (4 Hours)" };
  if (hours <= 8) return { price: p.fullDay, label: "Full Day (8 Hours)" };
  const extra = Math.ceil(hours - 8);
  return {
    price: p.fullDay + extra * p.extraHour,
    label: `Full Day + ${extra} Extra Hour${extra > 1 ? "s" : ""}`,
  };
}

/**
 * Price for one day, applying any weekday special.
 *
 * Weekday specials are alternative RATES, not percentage discounts, so they
 * replace the base tier price. Percentage discounts (multi-day, early booking)
 * then apply to the total on top.
 */
function priceDay(
  day: DaySchedule,
  cfg: PricingConfig
): { price: number; label: string; special: string | null } {
  const hours = durationHours(day.startTime, day.endTime);
  const dow = weekdayOf(day.date);
  const standard = standardTier(hours, cfg);

  // ── Monday Special ───────────────────────────────────────────────────────
  if (dow === 1 && cfg.mondaySpecial.enabled) {
    const ms = cfg.mondaySpecial;
    if (hours <= 3) {
      return { price: ms.hours3, label: "3 Hours", special: "Monday Special" };
    }
    // The published line reads "Full Day: ₦160,000 – 10am To 3pm", so the rate
    // is tied to that exact window rather than to any long Monday booking.
    if (day.startTime === ms.windowStart && day.endTime === ms.windowEnd) {
      // The line already shows the times, so don't repeat the window here.
      return { price: ms.windowRate, label: "Full Day", special: "Monday Special" };
    }
  }

  // ── Tuesday Value Deal: book N hours, get M free ─────────────────────────
  if (dow === 2 && cfg.tuesdayDeal.enabled) {
    const td = cfg.tuesdayDeal;
    const covered = td.qualifyingHours + td.freeHours;
    if (hours > td.qualifyingHours && hours <= covered) {
      // Charged as though only the qualifying hours were booked.
      const charged = standardTier(td.qualifyingHours, cfg);
      return {
        price: charged.price,
        label: charged.label,
        special: `Tuesday Value Deal — ${td.freeHours} hour${td.freeHours === 1 ? "" : "s"} free`,
      };
    }
  }

  return { price: standard.price, label: standard.label, special: null };
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
  return `${wd} ${d} ${mon}`;
}

/**
 * The full price calculation.
 *
 * Each day is charged on its own tier (with any weekday special) and the day
 * prices are summed. Charging the whole booking at one day's tier — what the
 * old single-window model did — overcharges any programme whose days differ.
 *
 * Percentage discounts do not stack: the single largest applicable one wins.
 * The price list does not say they combine, and not stacking is the safer read.
 */
export function computePrice(input: PricingInput, cfg: PricingConfig): BarePricing {
  const days = sortDays(input.days);

  const lines: QuoteLine[] = [];
  let baseSubtotal = 0;
  let totalHours = 0;
  const specials = new Set<string>();

  for (const day of days) {
    const hours = durationHours(day.startTime, day.endTime);
    const { price, label, special } = priceDay(day, cfg);
    totalHours += hours;
    baseSubtotal += price;
    if (special) specials.add(special);
    lines.push({
      label:
        `${formatDayLabel(day.date)} · ${day.startTime}–${day.endTime} · ${label}` +
        (special ? ` · ${special}` : ""),
      amount: price,
    });
  }

  // ── Percentage discounts — largest single one wins ────────────────────────
  const dates = days.map((d) => d.date);
  const consecutive = areConsecutive(dates);

  let discountPct = 0;
  let discountApplied = "None";

  if (consecutive) {
    // Multi-day discounts are written for CONSECUTIVE days, so a Mon/Wed/Fri
    // booking does not qualify. Tiers are pre-sorted longest-run-first.
    const tier = cfg.multiDay.find(
      (t) => days.length >= t.minDays && days.length <= t.maxDays
    );
    if (tier) {
      discountPct = tier.percent;
      discountApplied = `${days.length} Consecutive Days — ${tier.percent}%`;
    }
  }

  if (
    cfg.earlyBooking.enabled &&
    dates.length > 0 &&
    daysUntil(dates[0]) >= cfg.earlyBooking.minDaysAhead &&
    cfg.earlyBooking.percent > discountPct
  ) {
    discountPct = cfg.earlyBooking.percent;
    discountApplied = `Early Booking (${cfg.earlyBooking.minDaysAhead}+ days) — ${cfg.earlyBooking.percent}%`;
  }

  const discountAmount = Math.round((baseSubtotal * discountPct) / 100);
  if (discountAmount > 0) {
    lines.push({ label: discountApplied, amount: -discountAmount, tone: "discount" });
  }

  const subtotal = baseSubtotal - discountAmount;
  const { vatAmount, total } = applyVat(subtotal, cfg.vatRate);

  const dayWord = `${days.length} day${days.length === 1 ? "" : "s"}`;
  const parts = [`${dayWord}, ${totalHours} hours total`];
  if (specials.size > 0) parts.push([...specials].join("; "));
  if (discountAmount > 0) parts.push(`less ${discountPct}% (${discountApplied})`);

  return {
    hours: totalHours,
    days: days.length,
    lines,
    baseSubtotal,
    discountAmount,
    discountApplied,
    subtotal,
    breakdown: parts.join(", "),
    vatRate: cfg.vatRate,
    vatAmount,
    total,
    extrasPriced: Object.keys(cfg.extraPrices).length > 0,
    /** Days that fall on a Friday, so the caller can show the community note. */
    hasFriday: dates.some((d) => weekdayOf(d) === 5),
  };
}

// ─── Quote identity ──────────────────────────────────────────────────────────

/** Stable serialisation — fixed order, so a reordered payload hashes the same. */
function canonicalJson(input: PricingInput): string {
  return JSON.stringify([
    input.days.map((d) => [d.date, d.startTime, d.endTime]),
    input.participants,
  ]);
}

/**
 * Content-addressed quote id: same booking + same pricing config always
 * produce the same id, and therefore the same numbers. Editing rates in
 * /admin/pricing changes the config hash, which invalidates outstanding quotes
 * automatically — exactly what you want when a price changes.
 *
 * This is a cache key the server re-derives from the submitted booking, never a
 * carrier for an amount. A client cannot influence its own price by sending a
 * different id; a mismatched id is ignored and recomputed.
 */
export async function computeQuoteId(
  input: PricingInput,
  configHash: string
): Promise<string> {
  return createHash("sha256")
    .update(`${canonicalJson(input)}|${configHash}`)
    .digest("hex");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * The one function callers should use. Deterministic, so `/api/quote` and
 * `/api/book` cannot disagree; the cache exists to save the work, not to make
 * the answer stable.
 */
export async function getOrCreateQuote(
  input: PricingInput
): Promise<PricingResult> {
  const { config, hash } = await loadPricingConfig();
  const quoteId = await computeQuoteId(input, hash);

  // Imported lazily so this module stays usable without a database.
  const { readQuote, writeQuote } = await import("./quote-store");

  const cached = await readQuote(quoteId);
  if (cached) return cached;

  const result: PricingResult = {
    ...computePrice(input, config),
    quoteId,
    source: "deterministic",
  };

  await writeQuote(quoteId, input, result);
  return result;
}

/** Customer-facing notes that cannot be computed — shown alongside the quote. */
export async function getPricingNotes(): Promise<{
  fridayCommunityNote: string;
  manualNotes: string[];
}> {
  const { config } = await loadPricingConfig();
  return {
    fridayCommunityNote: config.fridayCommunityNote,
    manualNotes: config.manualNotes,
  };
}
