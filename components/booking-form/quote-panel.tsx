"use client";

import { cn } from "@/lib/utils";
import { fromIsoDate, type DaySchedule } from "@/lib/booking-schema";
import type { QuoteState } from "./types";

/**
 * The live quote.
 *
 * This panel is the point of the redesign: the customer sees what the booking
 * costs while they are still choosing, rather than discovering it after they've
 * agreed to pay. The figures come from the same engine that charges them, so
 * what is shown here is what is taken.
 */

export function naira(n: number): string {
  return `₦${Math.abs(n).toLocaleString("en-NG")}`;
}

function StatusChip({ state }: { state: QuoteState }) {
  if (state.status === "idle") return null;

  const config =
    state.status === "loading"
      ? { label: "Estimating…", className: "border-white/20 text-white/55" }
      : state.status === "unavailable"
        ? { label: "Quote on request", className: "border-white/25 text-white/70" }
        : state.quote.source === "ai"
          ? { label: "Live rate", className: "border-gold/40 text-gold" }
          : { label: "Indicative", className: "border-white/25 text-white/70" };

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        config.className
      )}
      title={
        state.status === "ready" && state.quote.source === "deterministic"
          ? "Standard package rate. Any promotional discount you qualify for is applied before payment."
          : undefined
      }
    >
      {config.label}
    </span>
  );
}

export function QuotePanel({
  state,
  days,
  participants,
  extras,
  className,
}: {
  state: QuoteState;
  days: DaySchedule[];
  participants?: number;
  extras: string[];
  className?: string;
}) {
  const quote =
    state.status === "ready"
      ? state.quote
      : state.status === "loading"
        ? state.previous
        : null;

  const isStale = state.status === "loading";

  // Per-day amounts are already listed below; this is just the header summary.
  const dateLabel =
    days.length === 0
      ? null
      : days.length === 1
        ? fromIsoDate(days[0].date).toLocaleDateString("en-NG", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : `${days.length} days`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-royal-deep p-7 text-white md:p-8",
        className
      )}
    >
      <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Your quote
          </p>
          <StatusChip state={state} />
        </div>
        <div className="mt-3 h-px bg-gold/30" />

        {/* ── Nothing chosen yet — this copy is the whole promise ─────────── */}
        {!quote && state.status !== "unavailable" && (
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Choose your dates and times and your price appears here — before you
            enter any personal details.
          </p>
        )}

        {state.status === "unavailable" && (
          <p className="mt-5 text-sm leading-relaxed text-white/70">
            We couldn&apos;t price this automatically. Submit your request and
            we&apos;ll confirm the amount by email within business hours.
          </p>
        )}

        {quote && (
          <div className={cn("mt-5", isStale && "opacity-60 transition-opacity")}>
            {dateLabel && (
              <p className="font-display text-lg leading-snug text-white">
                {dateLabel}
              </p>
            )}
            <p className="mt-1 text-xs text-white/55">
              {`${quote.hours} hour${quote.hours === 1 ? "" : "s"} total`}
              {participants ? ` · ${participants} people` : ""}
            </p>

            <dl className="mt-5 space-y-2.5 text-sm">
              {quote.lines.map((line, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <dt
                    className={cn(
                      "min-w-0 text-white/70",
                      line.tone === "discount" && "text-gold"
                    )}
                  >
                    {line.label}
                  </dt>
                  <dd
                    className={cn(
                      "shrink-0 tabular-nums",
                      line.tone === "discount" ? "text-gold" : "text-white"
                    )}
                  >
                    {line.amount === null
                      ? "—"
                      : line.amount < 0
                        ? `−${naira(line.amount)}`
                        : naira(line.amount)}
                  </dd>
                </div>
              ))}

              <div className="!mt-4 h-px bg-white/12" />

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-white/70">Subtotal (ex. VAT)</dt>
                <dd className="tabular-nums text-white">{naira(quote.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-white/70">VAT ({quote.vatRate}%)</dt>
                <dd className="tabular-nums text-white">{naira(quote.vatAmount)}</dd>
              </div>
            </dl>

            <div className="mt-4 h-0.5 bg-gold/60" />

            <div className="mt-4 flex items-end justify-between gap-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
                Total payable
              </span>
              <span
                className={cn(
                  "font-display text-3xl leading-none text-gold tabular-nums",
                  isStale && "animate-pulse"
                )}
                aria-live="polite"
              >
                {naira(quote.total)}
              </span>
            </div>
          </div>
        )}

        {quote?.hasFriday && quote.fridayCommunityNote && (
          <p className="mt-5 rounded-lg border border-gold/25 bg-gold/5 px-4 py-3 text-[11px] leading-relaxed text-gold-soft">
            {quote.fridayCommunityNote}
          </p>
        )}

        {/* ── Add-ons: requested, but not priced here ───────────────────────── */}
        {extras.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
              Requested add-ons
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/75">
              {extras.join(" · ")}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Quoted and confirmed with you separately — not included above.
            </p>
          </div>
        )}

        <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/45">
          Your slot is held for 6 hours after you submit, while you complete
          payment. Secure payment via Nomba — card or bank transfer.
        </p>
      </div>
    </div>
  );
}
