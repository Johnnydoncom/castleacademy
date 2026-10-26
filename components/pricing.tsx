import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Star, Sparkles } from "lucide-react";
import { loadPricingConfig } from "@/lib/pricing-config-store";
import { describePromoWindow, effectiveRates } from "@/lib/pricing-config";
import { naira } from "@/lib/format-money";

/**
 * Rates come from `pricing_config` — the same record the booking quote is
 * calculated from and the owner edits at /admin/pricing. They used to be
 * hardcoded here, so an admin price change updated what customers were charged
 * while this section kept advertising the old figure.
 *
 * While a promotion is running the sale rates are shown with the standard ones
 * struck through, from the same `effectiveRates` the engine prices with — so
 * the figure advertised here is the figure charged at checkout.
 */
export async function Pricing() {
  const { config } = await loadPricingConfig();
  const rates = effectiveRates(config);
  const { hours3, halfDay, fullDay, extraHour } = rates.packages;
  const promo = rates.active;
  const was = rates.standard;

  return (
    <section id="pricing" className="bg-ivory py-20 md:py-28" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Simple, honest pricing
          </p>
          <h2 id="pricing-heading" className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            One clear rate. No surprises at checkout.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Naira pricing. Instant confirmation. Pay securely via Nomba.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-cream shadow-xl shadow-royal/5">
          <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
            <div className="relative overflow-hidden bg-royal p-8 text-white md:p-12">
              <div className="absolute inset-0 grain opacity-30" />
              <div className="relative">
                {promo ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-royal-deep">
                    <Sparkles className="h-3 w-3" aria-hidden="true" /> {rates.name}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-soft">
                    <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" /> Standard Booking
                  </div>
                )}
                <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-5xl leading-none text-white md:text-6xl">
                    {naira(hours3)}
                  </span>
                  {promo && hours3 < was.hours3 && (
                    <span className="font-display text-2xl leading-none text-white/40 line-through">
                      {naira(was.hours3)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gold/80">(exclusive of VAT)</span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  for up to 3 hours of dedicated venue time
                </p>
                {promo && (
                  <p className="mt-3 inline-flex items-center rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-[11px] leading-relaxed text-gold-soft">
                    {[config.promo.blurb, describePromoWindow(config.promo)]
                      .filter(Boolean)
                      .join(" · ") || "Limited-time rate"}
                  </p>
                )}
                <div className="mt-10 h-px w-full bg-white/10" />
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                      Extra hour
                    </div>
                    <div className="mt-1 font-display text-2xl text-gold">
                      {naira(extraHour)}{" "}
                      {promo && extraHour < was.extraHour && (
                        <span className="text-base font-normal text-white/40 line-through">
                          {naira(was.extraHour)}
                        </span>
                      )}{" "}
                      <span className="text-sm font-normal text-gold/70">(excl. VAT)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                      Half day / Full day
                    </div>
                    <div className="mt-1 text-sm text-white/80">
                      {naira(halfDay)} · {naira(fullDay)}
                    </div>
                    {promo && (halfDay < was.halfDay || fullDay < was.fullDay) && (
                      <div className="text-xs text-white/40 line-through">
                        {naira(was.halfDay)} · {naira(was.fullDay)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h3 className="font-display text-2xl text-ink">Included with every booking</h3>
              <ul className="mt-6 space-y-3.5">
                {[
                  "Flexible training and event space",
                  "Smart TV, HDMI cables & wireless casting",
                  "High-speed fibre Wi-Fi for the whole room",
                  "Uninterrupted power (grid + inverter + generator)",
                  "Wireless microphones and sound system",
                  "Chilled bottled water on arrival",
                  "Dedicated on-site host during your session",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink/85">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full rounded-full bg-royal text-primary-foreground hover:bg-royal-deep"
                size="lg"
              >
                <a href="/booking">Reserve your date</a>
              </Button>
              <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Secure payment via Nomba · All prices ex. VAT ({config.vatRate}% VAT applies)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

