"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CANCELLATION_SUMMARY_TEXT } from "@/lib/policy";
import { fromIsoDate } from "@/lib/booking-schema";
import { naira } from "./quote-panel";
import type { BookingResult } from "./types";

/**
 * The post-submission state, on brand.
 *
 * Replaces the old emerald-and-emoji panel, which read as a different product
 * from the noir-and-gold page it sat inside. Every colour here is an existing
 * design token.
 */
export function Confirmation({
  result,
  onBookAnother,
}: {
  result: BookingResult;
  onBookAnother: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(
      () => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-3xl bg-royal-deep p-8 text-white animate-in fade-in zoom-in-95 duration-500 md:p-12"
    >
      <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gold/50" aria-hidden="true" />

      <div className="relative mx-auto max-w-xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold">
          <Check className="h-5 w-5 text-royal-deep" aria-hidden="true" />
        </span>

        <h3 className="mt-5 font-display text-2xl leading-tight text-white md:text-3xl">
          Your space is held.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          We&apos;ve emailed your confirmation and a pro-forma invoice to{" "}
          <span className="text-white">{result.email}</span>.
        </p>

        {/* ── Reference ──────────────────────────────────────────────────── */}
        <div className="mt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
            Booking reference
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-xl tracking-[0.18em] text-gold-soft">
              {result.reference}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(result.reference);
                toast.success("Reference copied");
              }}
              className="h-10 gap-2 text-white/70 hover:bg-white/10 hover:text-gold"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </Button>
          </div>
        </div>

        {/* ── Summary ────────────────────────────────────────────────────── */}
        <dl className="mt-7 space-y-2.5 border-t border-white/10 pt-6 text-sm">
          {result.summary.days.map((d) => (
            <Row
              key={d.date}
              label={formatDay(d.date)}
              value={`${d.startTime} – ${d.endTime}`}
            />
          ))}
          <Row label="Event" value={result.summary.eventTypeLabel} />
          <Row label="Participants" value={String(result.summary.participants)} />
          {result.summary.extras.length > 0 && (
            <Row label="Add-ons requested" value={result.summary.extras.join(", ")} />
          )}
        </dl>

        {/* ── Payment ────────────────────────────────────────────────────── */}
        {result.checkoutLink ? (
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-sm text-white/70">
              Complete payment to confirm the slot.
            </p>
            <a
              href={result.checkoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-semibold text-royal-deep transition-colors hover:bg-gold-soft"
            >
              {result.amount ? `Pay ${naira(result.amount)} now` : "Pay now"} →
            </a>
            <Countdown until={result.heldUntil} />
          </div>
        ) : (
          <p className="mt-7 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/70">
            We&apos;ll send payment instructions to {result.email} shortly. You can
            safely close this page.
          </p>
        )}

        {/* ── Footnotes ──────────────────────────────────────────────────── */}
        <div className="mt-7 space-y-2 border-t border-white/10 pt-6 text-[11px] leading-relaxed text-white/45">
          {result.summary.extras.length > 0 && (
            <p>
              Add-ons are quoted and confirmed with you separately — they are not
              included in the amount above.
            </p>
          )}
          <p>{CANCELLATION_SUMMARY_TEXT}</p>
          <p>
            Track this booking or download your invoice anytime in{" "}
            <a
              href="/account"
              className="text-gold underline-offset-4 hover:underline"
            >
              My Account
            </a>
            .
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onBookAnother}
          className="mt-7 h-11 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          Book another session
        </Button>
      </div>
    </div>
  );
}

/** "Wed 5 Aug" — each booked day gets its own row, since hours can differ. */
function formatDay(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-white/55">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

/** The 6-hour soft-lock, counted down so "held for 6 hours" is concrete. */
function Countdown({ until }: { until: number }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (now >= until) {
    return (
      <p className="mt-3 text-xs leading-relaxed text-white/55">
        Your hold has expired. Please submit again, or contact us and we&apos;ll
        sort it out.
      </p>
    );
  }

  const time = new Date(until).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <p className="mt-3 text-xs text-white/55">
      Held until <span className="text-white/80">{time}</span> today.
    </p>
  );
}
