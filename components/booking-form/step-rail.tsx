"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_ORDER, STEP_META, type StepId } from "@/lib/booking-schema";

/**
 * Numbered progress rail. Borrows the 01–04 gold-circle language already used by
 * the "how it works" section so the flow reads as part of the same system.
 *
 * Only completed steps are clickable — going forward always routes through the
 * validation gate in the parent, never through this component.
 */
export function StepRail({
  current,
  maxReached,
  onNavigate,
}: {
  current: StepId;
  maxReached: number;
  onNavigate: (step: StepId) => void;
}) {
  const currentIndex = STEP_META[current].index;

  return (
    /**
     * The connector — not a gap — absorbs the slack, so the rail spans the full
     * width and every step sits on the same rhythm regardless of how long its
     * label is. Gaps on both the list and the items used to stack, which made
     * the spacing either side of a connector unequal and the last step crowd
     * the right edge.
     */
    <ol className="flex w-full items-center" aria-label="Booking progress">
      {STEP_ORDER.map((step, i) => {
        const meta = STEP_META[step];
        const isCurrent = step === current;
        const isComplete = i < currentIndex;
        const isReachable = i <= maxReached;
        const isLast = i === STEP_ORDER.length - 1;

        return (
          <li
            key={step}
            className={cn("flex min-w-0 items-center", !isLast && "flex-1")}
          >
            <button
              type="button"
              onClick={() => isReachable && onNavigate(step)}
              disabled={!isReachable}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-full text-left transition-colors",
                isReachable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  // 44px on touch; the rail is a real navigation control, not decoration.
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors lg:h-10 lg:w-10",
                  isCurrent && "border-gold bg-gold text-royal-deep",
                  isComplete && "border-gold/60 bg-gold/10 text-gold",
                  !isCurrent && !isComplete && "border-white/20 text-white/40"
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {/*
                Only the current step is labelled. The form column is capped at
                ~620px, so four labels never fit — they clipped to "YOUR E…" and
                left the rail looking ragged at every width. The step heading
                immediately below names the step anyway, so the others are
                redundant rather than missing. Below `lg` even one label is too
                wide, and the heading is doing the work.
              */}
              {isCurrent && (
                <span className="hidden whitespace-nowrap text-xs font-medium uppercase tracking-[0.14em] text-white lg:inline">
                  {meta.label}
                </span>
              )}
            </button>

            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-2 h-px min-w-3 flex-1 sm:mx-3",
                  i < currentIndex ? "bg-gold/50" : "bg-white/15"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
