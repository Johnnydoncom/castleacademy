"use client";

import * as React from "react";
import { Pencil, X, Check, AlertTriangle } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fromIsoDate, type DaySchedule } from "@/lib/booking-schema";
import type { AvailabilityState } from "./use-availability";

/**
 * The list of chosen days and their hours.
 *
 * Most programmes run the same hours every day, so the default times at the top
 * apply to every day and each row only needs opening if that day differs. That
 * keeps the common case to two interactions while still letting day one run
 * 10:00–14:00 and day two 10:00–15:00 — which the old single-window model could
 * not express at all.
 */

function longDate(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function hoursBetween(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : null;
}

export function DayScheduleList({
  days,
  onChangeDay,
  onRemoveDay,
  availability,
  errorFor,
}: {
  days: DaySchedule[];
  onChangeDay: (date: string, patch: Partial<DaySchedule>) => void;
  onRemoveDay: (date: string) => void;
  availability: AvailabilityState;
  /** Row-level error message, if the parent has decided it may be shown. */
  errorFor: (index: number) => string | undefined;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);

  if (days.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No dates chosen yet. Pick one or more days above — they don&apos;t have to
        be consecutive.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {days.map((day, i) => {
        const isEditing = editing === day.date;
        const error = errorFor(i);
        const window = availability.windowFor(day.date);
        const closed = availability.closedDates.includes(day.date);
        const hours = hoursBetween(day.startTime, day.endTime);
        const busy = availability.byDate.get(day.date)?.busySlots ?? [];

        /**
         * Name the day explicitly. A greyed-out hour is always about THIS date —
         * saying so prevents it being read as "10:00 is booked everywhere".
         */
        const hintParts: string[] = [];
        if (window) {
          hintParts.push(`${longDate(day.date)}: open ${window.openTime}–${window.closeTime}.`);
        }
        if (busy.length > 0) {
          hintParts.push(
            `Already booked on ${longDate(day.date)}: ` +
              busy.map((b) => `${b.startTime}–${b.endTime}`).join(", ") +
              (availability.turnaroundMinutes > 0
                ? ` (plus ${availability.turnaroundMinutes} min turnaround).`
                : ".")
          );
        }
        // Say so while we don't yet know — otherwise a booked slot looks free.
        const checking = availability.status === "loading";
        const hint = checking
          ? "Checking what's already booked on this day…"
          : hintParts.length > 0
            ? hintParts.join(" ")
            : undefined;

        return (
          <li
            key={day.date}
            className={cn(
              "rounded-xl border bg-muted/30 transition-colors",
              error || closed ? "border-destructive/40" : "border-border"
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <span className="min-w-[6.5rem] text-sm font-medium text-foreground">
                {longDate(day.date)}
              </span>

              {!isEditing && (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {day.startTime && day.endTime
                    ? `${day.startTime} – ${day.endTime}`
                    : "No times set"}
                  {hours !== null && (
                    <span className="ml-2 text-xs text-muted-foreground/70">
                      {hours}h
                    </span>
                  )}
                </span>
              )}

              <span className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(isEditing ? null : day.date)}
                  aria-label={
                    isEditing
                      ? `Done editing ${longDate(day.date)}`
                      : `Change hours for ${longDate(day.date)}`
                  }
                  className="h-10 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isEditing ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDay(day.date)}
                  aria-label={`Remove ${longDate(day.date)}`}
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </span>
            </div>

            {isEditing && (
              <div className="grid gap-3 border-t border-border px-4 py-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`start-${day.date}`}
                    className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-ink/60"
                  >
                    Start
                  </label>
                  <TimePicker
                    id={`start-${day.date}`}
                    value={day.startTime}
                    onChange={(v) => onChangeDay(day.date, { startTime: v })}
                    placeholder="Start time"
                    busySlots={availability.busyFor(day.date)}
                    minTime={window?.openTime}
                    maxTime={window?.closeTime}
                    disabledHint={hint}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`end-${day.date}`}
                    className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-ink/60"
                  >
                    End
                  </label>
                  <TimePicker
                    id={`end-${day.date}`}
                    value={day.endTime}
                    onChange={(v) => onChangeDay(day.date, { endTime: v })}
                    placeholder="End time"
                    busySlots={availability.busyFor(day.date)}
                    minTime={window?.openTime}
                    maxTime={window?.closeTime}
                    notBefore={day.startTime}
                    disabledHint={hint}
                  />
                </div>
              </div>
            )}

            {!isEditing && busy.length > 0 && !closed && (
              <p className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
                Already booked on this day:{" "}
                {busy.map((b) => `${b.startTime}–${b.endTime}`).join(", ")}
              </p>
            )}

            {(error || closed) && (
              <p
                className="flex items-start gap-2 border-t border-destructive/20 px-4 py-2.5 text-xs font-medium text-destructive"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {closed ? "We're closed on this day — please remove it." : error}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
