"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { OPTIONAL_EXTRAS } from "@/lib/booking-schema";

/**
 * Step 3 — add-ons.
 *
 * These are requests, not line items: the pricing structure lists the services but
 * gives no rates, so pricing them here would be inventing numbers. They're
 * recorded on the booking and quoted separately, and the copy says so plainly
 * rather than letting the customer assume they're included in the total.
 */
export function StepExtras({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (extra: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONAL_EXTRAS.map((extra) => {
          const id = `extra-${extra.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          const checked = selected.includes(extra);
          return (
            <label
              key={extra}
              htmlFor={id}
              className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60 has-[:checked]:border-gold has-[:checked]:bg-gold/5"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => onToggle(extra, v === true)}
                className="border-border data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-royal-deep"
              />
              <span className="text-sm font-medium leading-tight text-foreground">
                {extra}
              </span>
            </label>
          );
        })}
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Add-ons are arranged on request. We&apos;ll confirm availability and cost
        with you by email — they are not included in the amount you pay today.
      </p>
    </div>
  );
}
