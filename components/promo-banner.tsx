import { loadPricingConfig } from "@/lib/pricing-config-store";
import { describePromoWindow, effectiveRates } from "@/lib/pricing-config";
import { naira } from "@/lib/format-money";
import { PromoStrip } from "./promo-strip";

/**
 * The promotional advert, shown above everything on the homepage and the
 * booking page.
 *
 * Reads `pricing_config` — the same record the quote engine prices from — so
 * the banner cannot advertise a sale the booking form will not honour, and it
 * disappears on its own the day the window closes with no deploy and nothing
 * to remember to switch off.
 */
export async function PromoBanner() {
  const { config } = await loadPricingConfig();
  const rates = effectiveRates(config);

  if (!rates.active) return null;

  // Lead with the first tier the sale actually lowers, rather than listing all
  // four in a one-line strip — and never name a tier whose price is unchanged.
  // `rates.active` guarantees at least one of these matches.
  const tiers = [
    ["hours3", "3 hours"],
    ["halfDay", "Half day"],
    ["fullDay", "Full day"],
    ["extraHour", "Extra hours"],
  ] as const;
  const lead = tiers.find(([key]) => rates.packages[key] < rates.standard[key])!;
  const headline = `${lead[1]} from ${naira(rates.packages[lead[0]])} — was ${naira(
    rates.standard[lead[0]]
  )}`;

  return (
    <PromoStrip
      name={rates.name}
      blurb={config.promo.blurb}
      window={describePromoWindow(config.promo)}
      headline={headline}
      // Identity, not content: editing the blurb mid-sale shouldn't resurrect
      // the banner for everyone who already closed it.
      storageKey={`ca-promo:${rates.name}:${config.promo.startDate}:${config.promo.endDate}`}
    />
  );
}
