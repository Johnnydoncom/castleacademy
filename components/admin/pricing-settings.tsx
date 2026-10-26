"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPTIONAL_EXTRAS } from "@/lib/booking-schema";
import {
  DEFAULT_PRICING_CONFIG,
  PACKAGE_KEYS,
  describePromoWindow,
  effectiveRates,
  promoStatus,
  type PackageRates,
  type PricingConfig,
} from "@/lib/pricing-config";

/**
 * Editor for the pricing structure.
 *
 * These values drive the booking quote directly and deterministically — saving
 * here changes what the next customer is charged, with no deploy. Anything that
 * cannot be decided from a booking form (the Friday community rate, loyalty,
 * membership, referrals) is kept as a note and applied by hand.
 */

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₦
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 pl-7 tabular-nums"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PercentField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type="number"
          min={0}
          max={100}
          step={0.5}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 pr-7 tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );
}

const PACKAGE_LABELS: Record<(typeof PACKAGE_KEYS)[number], string> = {
  hours3: "3 hours",
  halfDay: "4 hours (half day)",
  fullDay: "Full day (8 hours)",
  extraHour: "Each extra hour",
};

/**
 * What the owner is about to publish, in one line.
 *
 * A sale that is switched on but priced at or above the standard rate changes
 * nothing, and silently doing nothing is the worst possible outcome here — so
 * "no-effect" is called out as plainly as "running".
 */
function PromoStatusLine({ config }: { config: PricingConfig }) {
  const status = promoStatus(config);
  const window = describePromoWindow(config.promo);

  const copy: Record<typeof status, { text: string; className: string }> = {
    off: {
      text: "Switched off — every booking is charged the standard package rate.",
      className: "border-border bg-muted/40 text-muted-foreground",
    },
    scheduled: {
      text: `Scheduled — standard rates apply until the window opens. ${window}`,
      className: "border-sky-200 bg-sky-50 text-sky-900",
    },
    running: {
      text: `Live now — new bookings are being charged the promo rate. ${window}`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    ended: {
      text: `Ended — standard rates have resumed. ${window}`,
      className: "border-border bg-muted/40 text-muted-foreground",
    },
    "no-effect": {
      text:
        "On, but changing nothing — no promo rate is lower than its standard rate, so customers still pay full price.",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    },
  };

  const { text, className } = copy[status];
  return (
    <p className={`mt-4 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${className}`}>
      {text}
    </p>
  );
}

/** Standard vs promo, with the saving — what the customer will actually see. */
function PromoPreview({ config }: { config: PricingConfig }) {
  // Previewed as though the window were open, so the owner can check the
  // figures before the sale starts rather than after.
  const openToday = { ...config, promo: { ...config.promo, startDate: "", endDate: "" } };
  const rates = effectiveRates(openToday);
  if (!rates.active) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Package</th>
            <th className="px-3 py-2 text-right font-medium">Standard</th>
            <th className="px-3 py-2 text-right font-medium">Promo</th>
            <th className="px-3 py-2 text-right font-medium">Saving</th>
          </tr>
        </thead>
        <tbody>
          {PACKAGE_KEYS.map((key) => {
            const was = rates.standard[key];
            const now = rates.packages[key];
            const changed = now < was;
            return (
              <tr key={key} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{PACKAGE_LABELS[key]}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    changed ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {naira(was)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
                  {changed ? naira(now) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                  {changed ? `${Math.round(((was - now) / was) * 100)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PricingSettings() {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) setConfig(d.config);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load pricing");
        setLoading(false);
      });
  }, []);

  const patch = <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setConfig(data.config);
      toast.success("Pricing updated", {
        description: "New quotes use these rates immediately.",
      });
    } catch (err) {
      toast.error("Could not save pricing", {
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading pricing…
      </div>
    );
  }

  const p = config.packages;
  const m = config.mondaySpecial;
  const t = config.tuesdayDeal;
  // An existing saved config predates this field, so guard the read rather than
  // letting the editor crash on a row written before the promo shipped.
  const promo = config.promo ?? DEFAULT_PRICING_CONFIG.promo;
  // What a customer would be charged right now — promo included only if its
  // window is actually open today, so the example never over-promises.
  const liveRates = effectiveRates({ ...config, promo });

  return (
    <div className="space-y-5">
      <Section
        title="Packages"
        description="The standard rate for a single day, chosen by how long that day runs. Each day of a multi-day booking is priced on its own."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyField id="pkg-3h" label="3 hours" value={p.hours3}
            onChange={(v) => patch("packages", { ...p, hours3: v })} />
          <MoneyField id="pkg-half" label="4 hours (half day)" value={p.halfDay}
            onChange={(v) => patch("packages", { ...p, halfDay: v })} />
          <MoneyField id="pkg-full" label="Full day (8 hours)" value={p.fullDay}
            onChange={(v) => patch("packages", { ...p, fullDay: v })} />
          <MoneyField id="pkg-extra" label="Each extra hour" value={p.extraHour}
            hint="Added per hour beyond 8."
            onChange={(v) => patch("packages", { ...p, extraHour: v })} />
        </div>
      </Section>

      <Section
        title="Promotional pricing (sale)"
        description="A time-boxed sale price for the packages above. The window is judged against the day the booking is made, not the day of the event — book during the sale and you keep the rate whenever your event falls."
      >
        <div className="flex items-center gap-3">
          <Switch
            id="promo-enabled"
            checked={promo.enabled}
            onCheckedChange={(v) => patch("promo", { ...promo, enabled: v })}
          />
          <Label htmlFor="promo-enabled" className="text-sm">
            Run a promotion
          </Label>
        </div>

        {promo.enabled && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="promo-name" className="text-xs text-muted-foreground">
                  Promotion name
                </Label>
                <Input
                  id="promo-name"
                  value={promo.name}
                  maxLength={60}
                  placeholder="November Sale"
                  className="mt-1.5 h-11"
                  onChange={(e) => patch("promo", { ...promo, name: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Shown on the banner and on every quote line it discounts.
                </p>
              </div>
              <div>
                <Label htmlFor="promo-blurb" className="text-xs text-muted-foreground">
                  Banner message
                </Label>
                <Input
                  id="promo-blurb"
                  value={promo.blurb}
                  maxLength={160}
                  placeholder="Book any session this month and save."
                  className="mt-1.5 h-11"
                  onChange={(e) => patch("promo", { ...promo, blurb: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="promo-start" className="text-xs text-muted-foreground">
                  Starts
                </Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={promo.startDate}
                  className="mt-1.5 h-11"
                  onChange={(e) => patch("promo", { ...promo, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="promo-end" className="text-xs text-muted-foreground">
                  Ends
                </Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={promo.endDate}
                  min={promo.startDate || undefined}
                  className="mt-1.5 h-11"
                  onChange={(e) => patch("promo", { ...promo, endDate: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Both dates are inclusive and read in Lagos time. Leave a date
                empty to leave that side open-ended.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-foreground">Promo rates</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PACKAGE_KEYS.map((key) => (
                  <MoneyField
                    key={key}
                    id={`promo-${key}`}
                    label={PACKAGE_LABELS[key]}
                    value={promo.packages[key]}
                    hint={`Standard ${naira(p[key])}. Leave at 0 to keep it.`}
                    onChange={(v) =>
                      patch("promo", {
                        ...promo,
                        packages: { ...promo.packages, [key]: v } as PackageRates,
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <PromoPreview config={{ ...config, promo }} />

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              A promo rate is only used where it is lower than the standard rate,
              so a blank or mistyped figure can never raise what a customer pays.
              On a Monday the promo and the Monday Special compete and the cheaper
              one wins; the multi-day and early-booking percentages still come off
              on top.
            </p>
          </div>
        )}

        <PromoStatusLine config={{ ...config, promo }} />
      </Section>

      <Section
        title="Monday Special"
        description="Alternative Monday rates. These replace the package rate rather than discounting it."
      >
        <div className="flex items-center gap-3">
          <Switch
            id="monday-enabled"
            checked={m.enabled}
            onCheckedChange={(v) => patch("mondaySpecial", { ...m, enabled: v })}
          />
          <Label htmlFor="monday-enabled" className="text-sm">
            Apply the Monday Special
          </Label>
        </div>
        {m.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyField id="mon-3h" label="3 hours on a Monday" value={m.hours3}
              onChange={(v) => patch("mondaySpecial", { ...m, hours3: v })} />
            <MoneyField
              id="mon-window"
              label={`${m.windowStart}–${m.windowEnd} on a Monday`}
              value={m.windowRate}
              hint="Applies only to a booking matching this exact window."
              onChange={(v) => patch("mondaySpecial", { ...m, windowRate: v })}
            />
            <div>
              <Label htmlFor="mon-start" className="text-xs text-muted-foreground">
                Window starts
              </Label>
              <Input id="mon-start" type="time" value={m.windowStart} className="mt-1.5 h-11"
                onChange={(e) => patch("mondaySpecial", { ...m, windowStart: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mon-end" className="text-xs text-muted-foreground">
                Window ends
              </Label>
              <Input id="mon-end" type="time" value={m.windowEnd} className="mt-1.5 h-11"
                onChange={(e) => patch("mondaySpecial", { ...m, windowEnd: e.target.value })} />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Tuesday Value Deal"
        description="Book the qualifying hours and get the extra hours free — the customer is charged as though only the qualifying hours were booked."
      >
        <div className="flex items-center gap-3">
          <Switch id="tue-enabled" checked={t.enabled}
            onCheckedChange={(v) => patch("tuesdayDeal", { ...t, enabled: v })} />
          <Label htmlFor="tue-enabled" className="text-sm">
            Apply the Tuesday Value Deal
          </Label>
        </div>
        {t.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tue-q" className="text-xs text-muted-foreground">
                Qualifying hours
              </Label>
              <Input id="tue-q" type="number" min={1} max={12} value={t.qualifyingHours}
                className="mt-1.5 h-11 tabular-nums"
                onChange={(e) => patch("tuesdayDeal", { ...t, qualifyingHours: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="tue-f" className="text-xs text-muted-foreground">
                Free hours
              </Label>
              <Input id="tue-f" type="number" min={0} max={6} value={t.freeHours}
                className="mt-1.5 h-11 tabular-nums"
                onChange={(e) => patch("tuesdayDeal", { ...t, freeHours: Number(e.target.value) })} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              A Tuesday running up to {t.qualifyingHours + t.freeHours} hours is
              charged at the {t.qualifyingHours}-hour rate.
            </p>
          </div>
        )}
      </Section>

      <Section
        title="Multi-day discount"
        description="Applies only to consecutive days, as published. A Mon/Wed/Fri booking does not qualify."
      >
        <div className="space-y-3">
          {config.multiDay.map((tier, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="number" min={1} value={tier.minDays}
                  className="mt-1.5 h-11 tabular-nums"
                  onChange={(e) => {
                    const next = [...config.multiDay];
                    next[i] = { ...tier, minDays: Number(e.target.value) };
                    patch("multiDay", next);
                  }} />
              </div>
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="number" min={1} value={tier.maxDays}
                  className="mt-1.5 h-11 tabular-nums"
                  onChange={(e) => {
                    const next = [...config.multiDay];
                    next[i] = { ...tier, maxDays: Number(e.target.value) };
                    patch("multiDay", next);
                  }} />
              </div>
              <div className="w-28">
                <PercentField id={`md-${i}`} label="Discount" value={tier.percent}
                  onChange={(v) => {
                    const next = [...config.multiDay];
                    next[i] = { ...tier, percent: v };
                    patch("multiDay", next);
                  }} />
              </div>
              <Button type="button" variant="ghost" size="sm"
                aria-label={`Remove tier ${tier.minDays}–${tier.maxDays} days`}
                className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => patch("multiDay", config.multiDay.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-10 gap-2"
            onClick={() => patch("multiDay", [...config.multiDay, { minDays: 6, maxDays: 10, percent: 12 }])}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add tier
          </Button>
        </div>
      </Section>

      <Section title="Early booking & VAT">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3 flex items-center gap-3">
            <Switch id="early-enabled" checked={config.earlyBooking.enabled}
              onCheckedChange={(v) =>
                patch("earlyBooking", { ...config.earlyBooking, enabled: v })} />
            <Label htmlFor="early-enabled" className="text-sm">
              Apply the early-booking discount
            </Label>
          </div>
          <div>
            <Label htmlFor="early-days" className="text-xs text-muted-foreground">
              Days in advance
            </Label>
            <Input id="early-days" type="number" min={0} value={config.earlyBooking.minDaysAhead}
              className="mt-1.5 h-11 tabular-nums"
              onChange={(e) =>
                patch("earlyBooking", { ...config.earlyBooking, minDaysAhead: Number(e.target.value) })} />
          </div>
          <PercentField id="early-pct" label="Early-booking discount"
            value={config.earlyBooking.percent}
            onChange={(v) => patch("earlyBooking", { ...config.earlyBooking, percent: v })} />
          <PercentField id="vat" label="VAT" value={config.vatRate}
            onChange={(v) => patch("vatRate", v)} />
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Discounts do not stack — a booking receives whichever single percentage
          is largest.
        </p>
      </Section>

      <Section
        title="Add-on services"
        description="Leave an add-on at 0 to keep it quoted separately. Set a price and it becomes a charged line on the quote."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {OPTIONAL_EXTRAS.map((extra) => (
            <MoneyField
              key={extra}
              id={`extra-${extra}`}
              label={extra}
              value={config.extraPrices[extra] ?? 0}
              onChange={(v) => {
                const next = { ...config.extraPrices };
                if (v > 0) next[extra] = v;
                else delete next[extra];
                patch("extraPrices", next);
              }}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Notes applied by hand"
        description="Rules a booking form cannot verify. These are shown to the customer but never change the amount automatically."
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="friday-note" className="text-xs text-muted-foreground">
              Friday community rate note
            </Label>
            <Textarea id="friday-note" rows={3} className="mt-1.5"
              value={config.fridayCommunityNote}
              onChange={(e) => patch("fridayCommunityNote", e.target.value)} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Shown on the quote when any booked day falls on a Friday.
            </p>
          </div>
          <div>
            <Label htmlFor="manual-notes" className="text-xs text-muted-foreground">
              Other manual rules — one per line
            </Label>
            <Textarea id="manual-notes" rows={5} className="mt-1.5"
              value={config.manualNotes.join("\n")}
              onChange={(e) =>
                patch("manualNotes", e.target.value.split("\n").filter((l) => l.trim()))} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Loyalty, corporate membership and referral credit need customer
              history the booking form doesn&apos;t have, so they stay manual.
            </p>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Example: a single 3-hour weekday booking costs{" "}
          <strong className="text-foreground">
            {naira(Math.round(liveRates.packages.hours3 * (1 + config.vatRate / 100)))}
          </strong>{" "}
          including VAT
          {liveRates.active && (
            <>
              {" "}
              at the {liveRates.name} rate — was{" "}
              {naira(Math.round(p.hours3 * (1 + config.vatRate / 100)))}
            </>
          )}
          .
        </p>
        <Button onClick={save} disabled={saving} className="h-11 gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {saving ? "Saving…" : "Save pricing"}
        </Button>
      </div>
    </div>
  );
}

