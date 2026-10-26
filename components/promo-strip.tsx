"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";

/**
 * The promotional banner itself.
 *
 * Rendered by the server wrapper only while a promotion is actually running, so
 * this component never has to decide whether a sale is on — it only handles
 * dismissal.
 *
 * `storageKey` is derived from the promo's identity, so a NEW promotion shows
 * again to someone who dismissed the last one.
 */
export function PromoStrip({
  name,
  blurb,
  window: windowText,
  headline,
  storageKey,
}: {
  name: string;
  blurb: string;
  window: string;
  /** e.g. "3 hours from ₦60,000 (was ₦75,000)". */
  headline: string;
  storageKey: string;
}) {
  // Starts visible so the server and the first client render match exactly;
  // a previous dismissal is applied on mount. Anyone with JS off keeps the
  // banner, which is the right way round for an advert.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setDismissed(true);
    } catch {
      // Private mode or blocked storage — showing the banner is harmless.
    }
  }, [storageKey]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // Dismissal just won't persist; the banner still closes for this view.
    }
  };

  return (
    <aside
      aria-label={`${name} promotion`}
      className="relative z-50 border-b border-gold/30 bg-royal-deep text-white"
    >
      <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-5 py-2.5 md:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-royal-deep">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {name}
          </span>
          <span className="text-xs font-semibold text-white md:text-sm">{headline}</span>
          {blurb && (
            <span className="hidden text-xs text-white/70 lg:inline">{blurb}</span>
          )}
          {windowText && (
            <span className="text-[11px] font-medium text-gold-soft">{windowText}</span>
          )}
        </div>

        <Link
          href="/booking"
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-royal-deep transition-colors hover:bg-gold-soft sm:inline-flex"
        >
          Book now <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={dismiss}
          aria-label={`Dismiss the ${name} banner`}
          className="shrink-0 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
