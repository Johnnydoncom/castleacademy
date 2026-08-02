"use client";

import * as React from "react";
import { ChevronUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { QuotePanel, naira } from "./quote-panel";
import type { QuoteState } from "./types";

/**
 * Mobile total + primary action, pinned to the bottom of the viewport.
 *
 * On a phone a sticky sidebar isn't available, so the price rides along the
 * bottom next to the button that acts on it. Tapping the total opens the full
 * breakdown. The step's action is rendered here on mobile and inline on desktop
 * — never both, so there is exactly one submit button in the DOM.
 */
export function QuoteBar({
  state,
  action,
  panelProps,
}: {
  state: QuoteState;
  action: React.ReactNode;
  panelProps: React.ComponentProps<typeof QuotePanel>;
}) {
  const [open, setOpen] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);

  /**
   * Publish this bar's height so other bottom-pinned UI can clear it — the
   * global WhatsApp button otherwise lands directly on top of the primary
   * action. Measured rather than hardcoded because the label wraps at some
   * widths, and re-measured on resize.
   */
  React.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--sticky-bar-h",
        `${Math.round(el.getBoundingClientRect().height)}px`
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--sticky-bar-h");
    };
  }, []);

  const quote =
    state.status === "ready"
      ? state.quote
      : state.status === "loading"
        ? state.previous
        : null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-royal-deep px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 lg:hidden"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              disabled={!quote}
              className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center text-left disabled:cursor-default"
            >
              <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">
                {quote ? "Total inc. VAT" : "Your quote"}
              </span>
              {quote ? (
                <span className="flex items-center gap-1 font-display text-xl leading-tight text-gold tabular-nums">
                  {naira(quote.total)}
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              ) : (
                <span className="block text-sm leading-tight text-white/50">
                  {state.status === "loading" ? "Estimating…" : "Pick dates to price"}
                </span>
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent className="border-white/10 bg-royal-deep">
            <DrawerTitle className="sr-only">Your quote breakdown</DrawerTitle>
            <div className="max-h-[75vh] overflow-y-auto p-4">
              <QuotePanel {...panelProps} className="rounded-2xl" />
            </div>
          </DrawerContent>
        </Drawer>

        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
