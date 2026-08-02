"use client";

import * as React from "react";
import type { BusySlot, DayAvailability, WeeklyHours } from "./types";

/**
 * Availability for the exact set of dates the customer has picked.
 *
 * Keyed by date rather than by range: days need not be consecutive, and each day
 * carries its own opening hours and its own busy slots. The previous version
 * fetched a single range and intersected everything into one window, which could
 * only ever approximate a schedule where days differ.
 */

export interface AvailabilityState {
  status: "idle" | "loading" | "ready" | "error";
  weeklyHours: WeeklyHours[] | null;
  /** Gap required between two different bookings on the same day, in minutes. */
  turnaroundMinutes: number;
  byDate: Map<string, DayAvailability>;
  /** Selected dates the venue is closed on. */
  closedDates: string[];
  /**
   * Busy slots for a date, widened by the turnaround so the time picker greys
   * out the minutes a new booking could not legally occupy.
   */
  busyFor: (date: string) => BusySlot[];
  /** Opening window for a date, or null if unknown/closed. */
  windowFor: (date: string) => { openTime: string; closeTime: string } | null;
  refresh: () => void;
}

const EMPTY: BusySlot[] = [];

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(24 * 60, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function useAvailability(dates: string[]): AvailabilityState {
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHours[] | null>(null);
  const [turnaroundMinutes, setTurnaround] = React.useState(0);
  const [byDate, setByDate] = React.useState<Map<string, DayAvailability>>(new Map());
  const [status, setStatus] = React.useState<AvailabilityState["status"]>("idle");
  const [nonce, setNonce] = React.useState(0);

  // Stable key so the effect doesn't refire on a new array with the same dates.
  const key = React.useMemo(() => [...dates].sort().join(","), [dates]);

  // Opening hours + turnaround once on mount, so the calendar can grey out
  // closed weekdays before anything is picked.
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/availability?weekly=1", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.weeklyHours)) setWeeklyHours(d.weeklyHours);
        if (Number.isFinite(d.turnaroundMinutes)) setTurnaround(d.turnaroundMinutes);
      })
      .catch(() => {
        /* calendar simply won't pre-grey closed days */
      });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!key) {
      setByDate(new Map());
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timer = setTimeout(() => {
      fetch(`/api/availability?dates=${key}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (!Array.isArray(d.days)) {
            setStatus("error");
            return;
          }
          setByDate(new Map(d.days.map((day: DayAvailability) => [day.date, day])));
          if (Array.isArray(d.weeklyHours)) setWeeklyHours(d.weeklyHours);
          if (Number.isFinite(d.turnaroundMinutes)) setTurnaround(d.turnaroundMinutes);
          setStatus("ready");
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setStatus("error");
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, nonce]);

  const closedDates = React.useMemo(
    () =>
      [...byDate.values()].filter((d) => !d.venueHours.isOpen).map((d) => d.date),
    [byDate]
  );

  const busyFor = React.useCallback(
    (date: string): BusySlot[] => {
      const day = byDate.get(date);
      if (!day || day.busySlots.length === 0) return EMPTY;
      if (turnaroundMinutes <= 0) return day.busySlots;
      // Widen each slot both ways: a new booking must not start within the
      // turnaround of an existing one ending, nor end within it of one starting.
      return day.busySlots.map((s) => ({
        ...s,
        startTime: shift(s.startTime, -turnaroundMinutes),
        endTime: shift(s.endTime, turnaroundMinutes),
      }));
    },
    [byDate, turnaroundMinutes]
  );

  const windowFor = React.useCallback(
    (date: string) => {
      const day = byDate.get(date);
      if (day) {
        return day.venueHours.isOpen
          ? { openTime: day.venueHours.openTime, closeTime: day.venueHours.closeTime }
          : null;
      }
      // Not fetched yet — fall back to the weekday's published hours.
      if (!weeklyHours) return null;
      const [y, m, d] = date.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const h = weeklyHours[dow];
      return h?.isOpen ? { openTime: h.openTime, closeTime: h.closeTime } : null;
    },
    [byDate, weeklyHours]
  );

  const refresh = React.useCallback(() => setNonce((n) => n + 1), []);

  return {
    status,
    weeklyHours,
    turnaroundMinutes,
    byDate,
    closedDates,
    busyFor,
    windowFor,
    refresh,
  };
}
