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

export interface PackageRates {
  hours3: number;
  halfDay: number;
  fullDay: number;
  extraHour: number;
}

export const PACKAGE_KEYS = ["hours3", "halfDay", "fullDay", "extraHour"] as const;

/**
 * A time-boxed sale on the standard package rates.
 *
 * The window is judged against the day the BOOKING IS MADE (Lagos time), not
 * the day of the event — so a sale fills the order book now, whenever the
 * customer's event happens to fall.
 *
 * A promo rate of 0 means "this tier keeps its standard price", and a rate that
 * is not actually lower than the standard one is ignored: a promo must never be
 * able to raise what a customer pays.
 */
export interface PromoConfig {
  enabled: boolean;
  /** Headline on the banner, e.g. "November Sale". */
  name: string;
  /** One supporting line under the headline. May be empty. */
  blurb: string;
  /** Inclusive "YYYY-MM-DD", Lagos time. Empty means unbounded on that side. */
  startDate: string;
  endDate: string;
  /** Sale rates, mirroring `packages`. 0 = no promo on that tier. */
  packages: PackageRates;
}

export interface PricingConfig {
  packages: PackageRates;
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
  /** Optional sale on the package rates. Off by default. */
  promo: PromoConfig;
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
  // Off, with no rates set — an existing pricing_config row that predates this
  // field normalises to exactly this, so nothing changes until the owner says so.
  promo: {
    enabled: false,
    name: "",
    blurb: "",
    startDate: "",
    endDate: "",
    packages: { hours3: 0, halfDay: 0, fullDay: 0, extraHour: 0 },
  },
  earlyBooking: { enabled: true, minDaysAhead: 14, percent: 5 },
  vatRate: 7.5,
  extraPrices: {},
  fridayCommunityNote:
    "A community rate may apply for NGOs, educational organisations, startups and youth development programmes. Contact us and we will adjust before payment.",
  manualNotes: [],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
/** An ISO date, or "" for an open-ended side of the promo window. */
const isoDate = (v: unknown): string =>
  typeof v === "string" && ISO_DATE.test(v.trim()) ? v.trim() : "";
const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

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

  // A config written before the promo existed has no `promo` key at all, so
  // every field here falls back to "off" rather than to a live sale.
  const rawPromo = (r.promo ?? {}) as Partial<PromoConfig>;
  const rawPromoPkg = (rawPromo.packages ?? {}) as Partial<PackageRates>;
  const promo: PromoConfig = {
    enabled: rawPromo.enabled === true,
    name: str(rawPromo.name, 60),
    blurb: str(rawPromo.blurb, 160),
    startDate: isoDate(rawPromo.startDate),
    endDate: isoDate(rawPromo.endDate),
    packages: {
      hours3: money(rawPromoPkg.hours3, 0),
      halfDay: money(rawPromoPkg.halfDay, 0),
      fullDay: money(rawPromoPkg.fullDay, 0),
      extraHour: money(rawPromoPkg.extraHour, 0),
    },
  };
  // A window typed backwards would otherwise never open; treating it as a
  // single-sided window is a guess, so drop the end date and let the owner fix it.
  if (promo.startDate && promo.endDate && promo.endDate < promo.startDate) {
    promo.endDate = promo.startDate;
  }

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
    promo,
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

// ─── Promotional pricing ──────────────────────────────────────────────────────

/**
 * Today's date in Africa/Lagos as "YYYY-MM-DD".
 *
 * Lagos is UTC+1 year-round with no DST, so a fixed offset is exact rather than
 * merely close. Doing this by hand keeps the function pure and usable in the
 * browser, which `Intl` with a timeZone would also manage but far more slowly
 * on a path the booking form hits on every keystroke.
 */
export function lagosToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 60 * 60_000).toISOString().slice(0, 10);
}

/** The package rates actually in force, and whether a promo produced them. */
export interface EffectiveRates {
  /** What a booking is priced at today. */
  packages: PackageRates;
  /** The undiscounted rates, for struck-through display and savings maths. */
  standard: PackageRates;
  /** True only when the promo window is open AND it lowers at least one tier. */
  active: boolean;
  /** The promo's display name while `active`, else "". */
  name: string;
}

/** Whether `today` falls inside the promo's window, ignoring the rates. */
export function isPromoWindowOpen(
  promo: PromoConfig,
  today: string = lagosToday()
): boolean {
  if (!promo.enabled) return false;
  if (promo.startDate && today < promo.startDate) return false;
  if (promo.endDate && today > promo.endDate) return false;
  return true;
}

/**
 * Resolve the rates to charge today.
 *
 * A promo rate is honoured only where it is both set (> 0) and strictly lower
 * than the standard rate, so a half-filled or mistyped promo can only ever cost
 * the customer less — never more.
 */
export function effectiveRates(
  config: PricingConfig,
  today: string = lagosToday()
): EffectiveRates {
  const standard = config.packages;
  const inactive: EffectiveRates = { packages: standard, standard, active: false, name: "" };

  if (!isPromoWindowOpen(config.promo, today)) return inactive;

  const packages: PackageRates = { ...standard };
  let lowered = false;
  for (const key of PACKAGE_KEYS) {
    const promoRate = config.promo.packages[key];
    if (promoRate > 0 && promoRate < standard[key]) {
      packages[key] = promoRate;
      lowered = true;
    }
  }

  if (!lowered) return inactive;
  return { packages, standard, active: true, name: config.promo.name || "Special Offer" };
}

/** "5 Nov", for promo window copy. Parsed as UTC so it cannot slip a day. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
  return `${d} ${mon}${y === new Date().getUTCFullYear() ? "" : ` ${y}`}`;
}

/**
 * Human wording for the promo window — "Ends 30 Nov", "1–30 Nov", or "" when
 * the promo runs open-endedly. Shared so the banner, the pricing section and
 * the admin status line cannot drift apart.
 */
export function describePromoWindow(promo: PromoConfig): string {
  const { startDate: from, endDate: to } = promo;
  if (from && to) return `${shortDate(from)} – ${shortDate(to)}`;
  if (to) return `Ends ${shortDate(to)}`;
  if (from) return `From ${shortDate(from)}`;
  return "";
}

export type PromoStatus =
  | "off"          // switched off
  | "scheduled"    // on, but the window hasn't opened yet
  | "running"      // on, open, and actually lowering a rate
  | "ended"        // on, but the window has closed
  | "no-effect";   // on and open, but no rate beats the standard one

/** The promo's state today — drives the admin status line. */
export function promoStatus(
  config: PricingConfig,
  today: string = lagosToday()
): PromoStatus {
  const p = config.promo;
  if (!p.enabled) return "off";
  if (p.startDate && today < p.startDate) return "scheduled";
  if (p.endDate && today > p.endDate) return "ended";
  return effectiveRates(config, today).active ? "running" : "no-effect";
}
