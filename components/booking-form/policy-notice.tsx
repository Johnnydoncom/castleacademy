"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CANCELLATION_TIERS, CANCELLATION_CONSENT_TEXT } from "@/lib/policy";

/**
 * Cancellation terms and the consent checkbox.
 *
 * Shown on the last step, *after* the customer has seen the price — agreeing to
 * charges on an amount you haven't been told is not meaningful consent, and the
 * old form asked for exactly that.
 *
 * The terms are the tiered ones from `lib/policy.ts`; the form used to claim
 * bookings could never be cancelled, contradicting both the price list and the
 * FAQ on the same page.
 */
export function PolicyNotice({
  checked,
  onCheckedChange,
  error,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink/70">
        Cancellation &amp; rescheduling
      </p>

      <dl className="mt-3 space-y-2">
        {CANCELLATION_TIERS.map((tier) => (
          <div key={tier.window} className="text-sm leading-relaxed">
            <dt className="inline font-medium text-foreground">{tier.window}: </dt>
            <dd className="inline text-muted-foreground">{tier.outcome}</dd>
          </div>
        ))}
      </dl>

      <label
        htmlFor="agreedToPolicy"
        className="mt-4 flex cursor-pointer items-start gap-3 border-t border-border pt-4"
      >
        <Checkbox
          id="agreedToPolicy"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-required="true"
          aria-invalid={Boolean(error)}
          className="mt-0.5 border-border data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-royal-deep"
        />
        <span className="text-sm font-medium leading-relaxed text-foreground">
          {CANCELLATION_CONSENT_TEXT}
        </span>
      </label>

      {error && (
        <p className="mt-2 text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
