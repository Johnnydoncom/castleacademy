"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimePickerProps {
  id?: string;
  value?: string;          // "HH:mm" in 24-h, e.g. "14:30"
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-required"?: boolean;
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

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled,
  className,
  "aria-required": ariaRequired,
}: TimePickerProps) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-required={ariaRequired}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !display && "text-muted-foreground",
            className
          )}
        >
          <span>{display || placeholder}</span>
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 overflow-hidden rounded-xl border-border/50 shadow-xl"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex flex-col items-center justify-center border-b bg-muted/20 py-4">
            <div className="text-3xl font-light tabular-nums tracking-tight text-foreground">
              {h}:{m} <span className="text-lg font-medium text-muted-foreground">{period}</span>
            </div>
          </div>
          
          <div className="flex p-4 gap-6">
            {/* Hours */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hour</span>
              <div className="grid grid-cols-4 gap-2">
                {HOURS_12.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleH(item)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-all hover:bg-muted",
                      h === item
                        ? "bg-gold text-royal-deep font-semibold shadow-sm hover:bg-gold/90"
                        : "text-foreground font-medium"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-border/50 my-1" />

            {/* Minutes */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Minute</span>
              <div className="grid grid-cols-4 gap-2">
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleM(item)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-all hover:bg-muted",
                      m === item
                        ? "bg-gold text-royal-deep font-semibold shadow-sm hover:bg-gold/90"
                        : "text-foreground font-medium"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer AM/PM & Action */}
          <div className="flex items-center justify-between border-t bg-muted/10 p-3">
            <div className="flex rounded-lg bg-muted/50 p-1">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriod(p)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                    period === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-royal-deep shadow-sm transition-all hover:bg-gold/90"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
