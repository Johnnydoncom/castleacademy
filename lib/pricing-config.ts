/**
 * The editable pricing structure.
 *
 * Everything the deterministic engine needs to price a booking, held as data
 * rather than as prose for an LLM to interpret. The owner edits it at
 * /admin/pricing and prices change immediately — no deploy, and no model
 * inventing a Monday Special on a Wednesday.
 *
 * Rules that a booking form genuinely cannot decide are carried as notes and
 * applied by hand: the Friday community rate (no published figure, and
 * eligibility is unverifiable), loyalty, corporate membership, referral credit.
 *
 * This module is deliberately PURE — no database import. The admin editor is a
 * client component and needs `DEFAULT_PRICING_CONFIG`; pulling `lib/db` into the
 * browser bundle threw "DATABASE_URL environment variable is not set", since
 * that variable is (correctly) not exposed to the client. Reads and writes live
 * in `lib/pricing-config-store.ts`.
 */

export interface MultiDayTier {
  minDays: number;
  maxDays: number;
  percent: number;
}

export interface PricingConfig {
  packages: {
    hours3: number;
    halfDay: number;
    fullDay: number;
    extraHour: number;
  };
  /** Monday Special. `windowRate` applies only to a booking that exactly matches the window. */
  mondaySpecial: {
    enabled: boolean;
    hours3: number;
    windowRate: number;
    windowStart: string; // "HH:mm"
    windowEnd: string; // "HH:mm"
  };
  /** Tuesday Value Deal: book `qualifyingHours`, get `freeHours` free. */
  tuesdayDeal: {
    enabled: boolean;
    qualifyingHours: number;
    freeHours: number;
  };
  multiDay: MultiDayTier[];
  earlyBooking: { enabled: boolean; minDaysAhead: number; percent: number };
  vatRate: number;
  /** Add-on prices. Empty until the owner supplies rates; extras stay "quoted separately". */
  extraPrices: Record<string, number>;
  fridayCommunityNote: string;
  manualNotes: string[];
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  packages: { hours3: 100_000, halfDay: 120_000, fullDay: 180_000, extraHour: 30_000 },
  mondaySpecial: {
    enabled: true,
    hours3: 85_000,
    windowRate: 160_000,
    windowStart: "10:00",
    windowEnd: "15:00",
  },
  tuesdayDeal: { enabled: true, qualifyingHours: 4, freeHours: 1 },
  multiDay: [
    { minDays: 2, maxDays: 2, percent: 5 },
    { minDays: 3, maxDays: 5, percent: 10 },
  ],
  earlyBooking: { enabled: true, minDaysAhead: 14, percent: 5 },
  vatRate: 7.5,
  extraPrices: {},
  fridayCommunityNote:
    "A community rate may apply for NGOs, educational organisations, startups and youth development programmes. Contact us and we will adjust before payment.",
  manualNotes: [],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const money = (v: unknown, fallback: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const pct = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
};
const time = (v: unknown, fallback: string): string =>
  typeof v === "string" && HHMM.test(v) ? v : fallback;

/**
 * Coerce anything stored (or posted by an admin) into a complete, sane config.
 * Never throws — a malformed field falls back to the default rather than taking
 * pricing down.
 */
export function normalisePricingConfig(raw: unknown): PricingConfig {
  const d = DEFAULT_PRICING_CONFIG;
  const r = (raw ?? {}) as Partial<PricingConfig>;
  const p = r.packages ?? d.packages;
  const m = r.mondaySpecial ?? d.mondaySpecial;
  const t = r.tuesdayDeal ?? d.tuesdayDeal;
  const e = r.earlyBooking ?? d.earlyBooking;

  const multiDay = (Array.isArray(r.multiDay) ? r.multiDay : d.multiDay)
    .map((tier) => ({
      minDays: Math.max(1, Math.round(Number(tier?.minDays) || 0)),
      maxDays: Math.max(1, Math.round(Number(tier?.maxDays) || 0)),
      percent: pct(tier?.percent, 0),
    }))
    .filter((tier) => tier.maxDays >= tier.minDays && tier.percent > 0)
    // Longest run first, so the best applicable tier is found by a simple scan.
    .sort((a, b) => b.minDays - a.minDays);

  const extraPrices: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.extraPrices ?? {})) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n > 0) extraPrices[k] = n;
  }

  return {
    packages: {
      hours3: money(p.hours3, d.packages.hours3),
      halfDay: money(p.halfDay, d.packages.halfDay),
      fullDay: money(p.fullDay, d.packages.fullDay),
      extraHour: money(p.extraHour, d.packages.extraHour),
    },
    mondaySpecial: {
      enabled: m.enabled !== false,
      hours3: money(m.hours3, d.mondaySpecial.hours3),
      windowRate: money(m.windowRate, d.mondaySpecial.windowRate),
      windowStart: time(m.windowStart, d.mondaySpecial.windowStart),
      windowEnd: time(m.windowEnd, d.mondaySpecial.windowEnd),
    },
    tuesdayDeal: {
      enabled: t.enabled !== false,
      qualifyingHours: Math.max(1, Number(t.qualifyingHours) || d.tuesdayDeal.qualifyingHours),
      freeHours: Math.max(0, Number(t.freeHours) || d.tuesdayDeal.freeHours),
    },
    multiDay: multiDay.length > 0 ? multiDay : d.multiDay,
    earlyBooking: {
      enabled: e.enabled !== false,
      minDaysAhead: Math.max(0, Math.round(Number(e.minDaysAhead) || d.earlyBooking.minDaysAhead)),
      percent: pct(e.percent, d.earlyBooking.percent),
    },
    vatRate: pct(r.vatRate, d.vatRate),
    extraPrices,
    fridayCommunityNote:
      typeof r.fridayCommunityNote === "string" ? r.fridayCommunityNote : d.fridayCommunityNote,
    manualNotes: Array.isArray(r.manualNotes)
      ? r.manualNotes.filter((n): n is string => typeof n === "string")
      : d.manualNotes,
  };
}

/**
 * Human wording for the multi-day tiers, e.g. "5% off 2 consecutive days ·
 * 10% off 3–5 days". Shared by every surface that advertises the discount so
 * the pricing section, the incentives cards and the FAQ cannot drift apart.
 */
export function describeMultiDayTiers(config: PricingConfig): string {
  return [...config.multiDay]
    .sort((a, b) => a.minDays - b.minDays)
    .map(
      (t) =>
        `${t.percent}% off ${
          t.minDays === t.maxDays
            ? `${t.minDays} consecutive days`
            : `${t.minDays}–${t.maxDays} days`
        }`
    )
    .join(" · ");
}
