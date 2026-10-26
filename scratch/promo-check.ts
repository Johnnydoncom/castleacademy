import { computePrice } from "../lib/pricing";
import { DEFAULT_PRICING_CONFIG, effectiveRates, normalisePricingConfig, promoStatus, type PricingConfig } from "../lib/pricing-config";

const base: PricingConfig = normalisePricingConfig({
  ...DEFAULT_PRICING_CONFIG,
  packages: { hours3: 75_000, halfDay: 95_000, fullDay: 150_000, extraHour: 20_000 },
});

const withPromo = (over: Partial<PricingConfig["promo"]>): PricingConfig =>
  normalisePricingConfig({
    ...base,
    promo: {
      enabled: true, name: "November Sale", blurb: "",
      startDate: "2026-11-01", endDate: "2026-11-30",
      packages: { hours3: 60_000, halfDay: 80_000, fullDay: 0, extraHour: 0 },
      ...over,
    },
  });

let fails = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`);
};

// 2026-11-04 is a Wednesday, 11-02 a Monday, 11-03 a Tuesday.
const day = (date: string, s = "09:00", e = "12:00") => ({ date, startTime: s, endTime: e });
const price = (cfg: PricingConfig, days: ReturnType<typeof day>[], today: string) =>
  computePrice({ days, participants: 10 }, cfg, today);

// ── 1. Regression: no promo configured behaves exactly as before ─────────────
check("no promo · 3h Wed", price(base, [day("2026-11-04")], "2026-11-04").baseSubtotal, 75_000);
check("no promo · no promoName", price(base, [day("2026-11-04")], "2026-11-04").promoName, undefined);

// ── 2. Promo active, booked inside the window ────────────────────────────────
const p = withPromo({});
check("promo · 3h Wed charged at sale rate", price(p, [day("2026-11-04")], "2026-11-15").baseSubtotal, 60_000);
check("promo · savings reported", price(p, [day("2026-11-04")], "2026-11-15").promoSavings, 15_000);
check("promo · named on the line", price(p, [day("2026-11-04")], "2026-11-15").lines[0].label.includes("November Sale"), true);

// ── 3. Window is judged on the BOOKING date, not the event date ──────────────
check("booked before window · full price", price(p, [day("2026-11-04")], "2026-10-20").baseSubtotal, 75_000);
check("booked after window · full price", price(p, [day("2026-11-04")], "2026-12-01").baseSubtotal, 75_000);
check("booked in window, event in March · sale price", price(p, [day("2027-03-10")], "2026-11-15").baseSubtotal, 60_000);
check("boundary: first day inclusive", price(p, [day("2026-11-04")], "2026-11-01").baseSubtotal, 60_000);
check("boundary: last day inclusive", price(p, [day("2026-11-04")], "2026-11-30").baseSubtotal, 60_000);

// ── 4. A promo can never raise the price ─────────────────────────────────────
const higher = withPromo({ packages: { hours3: 90_000, halfDay: 0, fullDay: 0, extraHour: 0 } });
check("promo above standard is ignored", price(higher, [day("2026-11-04")], "2026-11-15").baseSubtotal, 75_000);
check("...and reports no-effect", promoStatus(higher, "2026-11-15"), "no-effect");

// ── 5. Monday: promo and the Monday Special compete, cheaper wins ────────────
// Monday Special 3h is 85,000; promo is 60,000 → promo wins.
const mon = price(p, [day("2026-11-02")], "2026-11-15");
check("Monday · promo beats the Monday Special", mon.baseSubtotal, 60_000);
check("Monday · line names the promo", mon.lines[0].label.includes("November Sale"), true);
check("Monday · line does not claim Monday Special", mon.lines[0].label.includes("Monday Special"), false);

// Now make the Monday Special the cheaper one.
const cheapMon = normalisePricingConfig({ ...p, mondaySpecial: { ...p.mondaySpecial, hours3: 50_000 } });
const mon2 = price(cheapMon, [day("2026-11-02")], "2026-11-15");
check("Monday · cheaper Monday Special wins", mon2.baseSubtotal, 50_000);
check("Monday · line names the special", mon2.lines[0].label.includes("Monday Special"), true);

// ── 6. Tuesday Value Deal prices the qualifying tier at the promo rate ───────
// 5h on a Tuesday → charged at the 4h (halfDay) tier → promo halfDay 80,000.
const tue = price(p, [day("2026-11-03", "09:00", "14:00")], "2026-11-15");
check("Tuesday deal · charged at promo half-day rate", tue.baseSubtotal, 80_000);
check("Tuesday deal · names both", tue.lines[0].label.includes("November Sale") && tue.lines[0].label.includes("Tuesday Value Deal"), true);

// ── 7. Percentage discounts still stack on top of the promo ──────────────────
// Wed 4 Nov + Thu 5 Nov consecutive → 5% multi-day on 2 × 60,000.
const twoDay = price(p, [day("2026-11-04"), day("2026-11-05")], "2026-11-15");
check("multi-day · promo base", twoDay.baseSubtotal, 120_000);
check("multi-day · 5% off the promo price", twoDay.discountAmount, 6_000);
check("multi-day · subtotal", twoDay.subtotal, 114_000);
check("multi-day · VAT 7.5%", twoDay.vatAmount, 8_550);
check("multi-day · total", twoDay.total, 122_550);

// ── 8. Extra-hour promo applies beyond 8 hours ───────────────────────────────
const extra = withPromo({ packages: { hours3: 0, halfDay: 0, fullDay: 120_000, extraHour: 10_000 } });
// 10h → fullDay + 2 extra hours.
check("10h at promo rates", price(extra, [day("2026-11-04", "08:00", "18:00")], "2026-11-15").baseSubtotal, 140_000);

// ── 9. Config hygiene ────────────────────────────────────────────────────────
check("legacy row without a promo key normalises to off", normalisePricingConfig({}).promo.enabled, false);
check("backwards window is clamped", normalisePricingConfig({ promo: { enabled: true, startDate: "2026-11-10", endDate: "2026-11-01" } }).promo.endDate, "2026-11-10");
check("open-ended window runs", effectiveRates(withPromo({ startDate: "", endDate: "" }), "2030-01-01").active, true);
check("disabled promo is inert", effectiveRates(withPromo({ enabled: false }), "2026-11-15").active, false);

console.log(fails === 0 ? "\nAll checks passed." : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
