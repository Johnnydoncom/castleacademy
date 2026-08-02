"use client";

import * as React from "react";
import { CalendarIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { TimePicker } from "@/components/ui/time-picker";
import { Field, errorId } from "@/components/field";
import { useIsCompact } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { fromIsoDate, toIsoDate, type DaySchedule } from "@/lib/booking-schema";
import { DayScheduleList } from "./day-schedule";
import type { AvailabilityState } from "./use-availability";

/**
 * Step 1 — when.
 *
 * Deliberately first: availability is the real gate, and nothing can be priced
 * until it is answered. Dates are a *set*, not a range, so a programme running
 * every Tuesday for a month is one booking rather than four.
 */
export function StepWhen({
  days,
  onDatesChange,
  onChangeDay,
  onRemoveDay,
  defaultStart,
  defaultEnd,
  onDefaultTimesChange,
  availability,
  errors,
}: {
  days: DaySchedule[];
  onDatesChange: (dates: string[]) => void;
  onChangeDay: (date: string, patch: Partial<DaySchedule>) => void;
  onRemoveDay: (date: string) => void;
  defaultStart?: string;
  defaultEnd?: string;
  onDefaultTimesChange: (patch: { startTime?: string; endTime?: string }) => void;
  availability: AvailabilityState;
  errors: { days?: string; rowFor: (index: number) => string | undefined };
}) {
  const isCompact = useIsCompact();
  const [open, setOpen] = React.useState(false);
  const { weeklyHours } = availability;

  /**
   * The shared control has to suit every selected day, so it is bounded by the
   * narrowest opening window among them — a Saturday closing at 16:00 caps it.
   *
   * It is deliberately NOT bounded by existing bookings. Those belong to one
   * date, and applying them here would grey out a time on every day because it
   * happens to be taken on one of them. Per-day conflicts are shown on the
   * rows below instead.
   */
  const sharedWindow = React.useMemo(() => {
    const windows = days
      .map((d) => availability.windowFor(d.date))
      .filter((w): w is { openTime: string; closeTime: string } => w !== null);
    if (windows.length === 0) return null;
    const openTime = windows.reduce((a, w) => (w.openTime > a ? w.openTime : a), "00:00");
    const closeTime = windows.reduce((a, w) => (w.closeTime < a ? w.closeTime : a), "23:59");
    return openTime < closeTime ? { openTime, closeTime } : null;
  }, [days, availability]);

  const sharedHint = sharedWindow
    ? days.length > 1
      ? `Across your selected days the room is open ${sharedWindow.openTime}–${sharedWindow.closeTime}. Times already booked are shown per day below.`
      : `We're open ${sharedWindow.openTime}–${sharedWindow.closeTime} on this day.`
    : undefined;

  const selectedDates = React.useMemo(
    () => days.map((d) => fromIsoDate(d.date)),
    [days]
  );

  const label =
    days.length === 0
      ? null
      : days.length === 1
        ? fromIsoDate(days[0].date).toLocaleDateString("en-NG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : `${days.length} days selected`;

  const handleSelect = (dates: Date[] | undefined) => {
    onDatesChange((dates ?? []).map(toIsoDate).sort());
  };

  const calendar = (
    <Calendar
      mode="multiple"
      selected={selectedDates}
      onSelect={handleSelect}
      autoFocus
      numberOfMonths={isCompact ? 1 : 2}
      className="p-3"
      disabled={[
        { before: new Date() },
        // Closed weekdays are greyed out before any date is picked.
        (date: Date) => (weeklyHours ? !weeklyHours[date.getDay()]?.isOpen : false),
      ]}
    />
  );

  const helper = (
    <p className="border-t px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
      Tap each day you need — they don&apos;t have to be consecutive, so a weekly
      course can be one booking. Tap again to remove. Greyed-out days are closed.
    </p>
  );

  const trigger = (
    <Button
      id="dateRange"
      type="button"
      variant="outline"
      aria-required="true"
      aria-invalid={Boolean(errors.days)}
      aria-describedby={errors.days ? errorId("dateRange") : undefined}
      className={cn(
        "h-12 w-full justify-start bg-background text-left font-normal",
        days.length === 0 && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
      {label ?? "Choose one or more days"}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Field
        label="Event dates"
        hint="one or many"
        error={errors.days}
        htmlFor="dateRange"
      >
        {isCompact ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent>
              <DrawerTitle className="px-4 pt-4 text-sm font-medium">
                Choose your dates
              </DrawerTitle>
              <div className="flex justify-center">{calendar}</div>
              {helper}
              <div className="p-4">
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-12 w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft"
                >
                  Done
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              {calendar}
              {helper}
            </PopoverContent>
          </Popover>
        )}
      </Field>

      {/* Shared hours — most programmes run the same times every day. */}
      <div>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.12em] text-ink/70">
          Hours{days.length > 1 ? " for every day" : ""}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TimePicker
            id="defaultStart"
            value={defaultStart}
            onChange={(v) => onDefaultTimesChange({ startTime: v })}
            placeholder="Start time"
            minTime={sharedWindow?.openTime}
            maxTime={sharedWindow?.closeTime}
            disabledHint={sharedHint}
            aria-required
          />
          <TimePicker
            id="defaultEnd"
            value={defaultEnd}
            onChange={(v) => onDefaultTimesChange({ endTime: v })}
            placeholder="End time"
            minTime={sharedWindow?.openTime}
            maxTime={sharedWindow?.closeTime}
            notBefore={defaultStart}
            disabledHint={sharedHint}
            aria-required
          />
        </div>
        {days.length > 1 && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Applied to every day below. Any day that runs different hours can be
            changed individually.
          </p>
        )}
      </div>

      {days.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.12em] text-ink/70">
            Your schedule
          </p>
          <DayScheduleList
            days={days}
            onChangeDay={onChangeDay}
            onRemoveDay={onRemoveDay}
            availability={availability}
            errorFor={errors.rowFor}
          />
        </div>
      )}

      {availability.turnaroundMinutes > 0 && days.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          We leave {availability.turnaroundMinutes} minutes between bookings to
          reset the room, so times close to an existing booking are unavailable.
        </p>
      )}
    </div>
  );
}

