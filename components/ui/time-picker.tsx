"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsCompact } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusySlot {
  startTime: string;
  endTime: string;
}

interface TimePickerProps {
  id?: string;
  value?: string;          // "HH:mm" in 24-h, e.g. "14:30"
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-required"?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  busySlots?: BusySlot[];
  /** Venue opening time — earlier times are disabled. "HH:mm" */
  minTime?: string;
  /** Venue closing time — later times are disabled. "HH:mm" */
  maxTime?: string;
  /** Times at or before this are disabled. Used on the end picker so it can't precede the start. */
  notBefore?: string;
  /** Explains the greyed-out times, e.g. "We're open 09:00–18:00 on your selected days." */
  disabledHint?: string;
}

interface Constraints {
  busySlots?: BusySlot[];
  minTime?: string;
  maxTime?: string;
  notBefore?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function parse24(val: string | undefined): { h: string; m: string; period: "AM" | "PM" } {
  if (!val) return { h: "09", m: "00", period: "AM" };
  const [hRaw, mRaw] = val.split(":");
  const h24 = parseInt(hRaw, 10);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h: String(h12).padStart(2, "0"), m: String(parseInt(mRaw || "0", 10)).padStart(2, "0"), period };
}

function to24(h: string, m: string, period: "AM" | "PM"): string {
  let h24 = parseInt(h, 10);
  if (period === "AM" && h24 === 12) h24 = 0;
  if (period === "PM" && h24 !== 12) h24 += 12;
  return `${String(h24).padStart(2, "0")}:${m}`;
}

function displayTime(val: string | undefined): string {
  if (!val) return "";
  const { h, m, period } = parse24(val);
  return `${h}:${m} ${period}`;
}

/**
 * A time is unavailable if it falls inside a busy slot, outside the venue's
 * opening window, or at/before a floor set by another field. Times are "HH:mm"
 * so lexical comparison is chronological.
 */
function isTimeUnavailable(time24: string, c: Constraints): boolean {
  if (c.minTime && time24 < c.minTime) return true;
  if (c.maxTime && time24 > c.maxTime) return true;
  if (c.notBefore && time24 <= c.notBefore) return true;
  for (const slot of c.busySlots ?? []) {
    if (time24 >= slot.startTime && time24 < slot.endTime) return true;
  }
  return false;
}

function isHourCompletelyUnavailable(hRaw: string, period: "AM" | "PM", c: Constraints): boolean {
  // Only fully-blocked hours are disabled — a partially-available hour stays
  // selectable so the minute grid can narrow it down.
  for (let m = 0; m < 60; m += 5) {
    const time24 = to24(hRaw, String(m).padStart(2, "0"), period);
    if (!isTimeUnavailable(time24, c)) return false;
  }
  return true;
}

function isMinuteUnavailableForHour(hRaw: string, mRaw: string, period: "AM" | "PM", c: Constraints): boolean {
  return isTimeUnavailable(to24(hRaw, mRaw, period), c);
}

function isPeriodUnavailable(period: "AM" | "PM", c: Constraints): boolean {
  return HOURS_12.every((h) => isHourCompletelyUnavailable(h, period, c));
}

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled,
  className,
  busySlots,
  minTime,
  maxTime,
  notBefore,
  disabledHint,
  "aria-required": ariaRequired,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const isCompact = useIsCompact();
  const constraints = React.useMemo<Constraints>(
    () => ({ busySlots, minTime, maxTime, notBefore }),
    [busySlots, minTime, maxTime, notBefore]
  );
  const [open, setOpen] = React.useState(false);
  const parsed = parse24(value);
  const [h, setH] = React.useState(parsed.h);
  const [m, setM] = React.useState(() => {
    const raw = parseInt(parsed.m, 10);
    return String(Math.round(raw / 5) * 5 % 60).padStart(2, "0");
  });
  const [period, setPeriod] = React.useState<"AM" | "PM">(parsed.period);

  React.useEffect(() => {
    if (value) {
      const p = parse24(value);
      setH(p.h);
      setM(String(Math.round(parseInt(p.m, 10) / 5) * 5 % 60).padStart(2, "0"));
      setPeriod(p.period);
    }
  }, [value]);

  const commit = React.useCallback(
    (newH: string, newM: string, newPeriod: "AM" | "PM") => {
      onChange?.(to24(newH, newM, newPeriod));
    },
    [onChange]
  );

  const handleH = (v: string) => { setH(v); commit(v, m, period); };
  const handleM = (v: string) => { setM(v); commit(h, v, period); };
  const handlePeriod = (v: "AM" | "PM") => { setPeriod(v); commit(h, m, v); };

  const display = value ? displayTime(value) : "";
  const current24 = to24(h, m, period);
  const isBusy = isTimeUnavailable(current24, constraints);

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-required={ariaRequired}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !display && "text-muted-foreground",
        className
      )}
    >
      <span>{display || placeholder}</span>
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );

  /**
   * Shared body. On compact screens the two grids stack and stretch to the full
   * width; side by side they need ~457px, which overflows a 375px phone.
   */
  const body = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center justify-center border-b bg-muted/20 py-4">
        <div className={cn("text-3xl font-light tabular-nums tracking-tight", isBusy ? "text-destructive" : "text-foreground")}>
          {h}:{m} <span className="text-lg font-medium text-muted-foreground">{period}</span>
        </div>
        {isBusy && <span className="mt-1 text-[11px] font-medium text-destructive">This time is unavailable</span>}
      </div>

      <div className="flex flex-col gap-5 p-4 lg:flex-row lg:gap-6">
        {/* Hours */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hour</span>
          <div className="grid grid-cols-6 gap-2 lg:grid-cols-4">
            {HOURS_12.map((item) => {
              const fullyBusy = isHourCompletelyUnavailable(item, period, constraints);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleH(item)}
                  disabled={fullyBusy}
                  className={cn(
                    "flex h-11 min-w-0 items-center justify-center rounded-md text-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 lg:h-9 lg:w-9",
                    h === item
                      ? "bg-gold font-semibold text-royal-deep shadow-sm hover:bg-gold/90"
                      : "font-medium text-foreground",
                    fullyBusy && "text-muted-foreground line-through"
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="my-1 hidden w-px bg-border/50 lg:block" />

        {/* Minutes */}
        <div className="flex min-w-0 flex-col gap-2.5 border-t pt-4 lg:border-t-0 lg:pt-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Minute</span>
          <div className="grid grid-cols-6 gap-2 lg:grid-cols-4">
            {MINUTES.map((item) => {
              const minuteBusy = isMinuteUnavailableForHour(h, item, period, constraints);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleM(item)}
                  disabled={minuteBusy}
                  className={cn(
                    "flex h-11 min-w-0 items-center justify-center rounded-md text-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 lg:h-9 lg:w-9",
                    m === item
                      ? "bg-gold font-semibold text-royal-deep shadow-sm hover:bg-gold/90"
                      : "font-medium text-foreground",
                    minuteBusy && "text-muted-foreground line-through"
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer AM/PM & Action */}
      <div className="flex items-center justify-between gap-3 border-t bg-muted/10 p-3">
        <div className="flex rounded-lg bg-muted/50 p-1">
          {(["AM", "PM"] as const).map((p) => {
            const periodOut = isPeriodUnavailable(p, constraints);
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriod(p)}
                disabled={periodOut}
                className={cn(
                  "min-h-[40px] rounded-md px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => setOpen(false)}
          className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-royal-deep shadow-sm transition-all hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done
        </button>
      </div>

      {disabledHint && (
        <p className="border-t bg-muted/20 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {disabledHint}
        </p>
      )}
    </div>
  );

  if (isCompact) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle className="sr-only">Choose a time</DrawerTitle>
          <div className="max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {body}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-xl border-border/50 p-0 shadow-xl"
        align="start"
        sideOffset={8}
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}
