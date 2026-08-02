import { z } from "zod";

/**
 * The single booking schema, shared by the client form and `/api/book`.
 *
 * Deliberately ONE `.superRefine()`'d object rather than four per-step schemas,
 * so the cross-field date/time rules can see every value and the type stays
 * single-sourced.
 *
 * IMPORTANT — `trigger(names)` is NOT scoped to `names` when a resolver is in
 * play. It parses the whole schema and commits errors for every invalid field,
 * including fields belonging to later steps. Verified in the browser: pressing
 * Continue on step 1 populated errors for the step-4 contact fields, which then
 * appeared the instant that step rendered.
 *
 * So the form never treats "an error exists" as "show it". Display is gated on
 * the user having touched the field or tried to leave the step — see
 * `stepError` in components/booking.tsx. Do not rely on `trigger` for
 * isolation, and do not remove that gate.
 *
 * Two rules still apply to the refinements below:
 *
 *   1. Every superRefine issue must carry a `path` belonging to the step that
 *      gates it, or the user is blocked with no visible reason. All cross-field
 *      rules here land on `days[...]`, which step 1 owns.
 *
 *   2. superRefine runs while later fields are still `undefined`. Guard every
 *      rule with an early return.
 */

// ─── Steps ────────────────────────────────────────────────────────────────────

export const STEP_ORDER = ["when", "event", "extras", "details"] as const;
export type StepId = (typeof STEP_ORDER)[number];

export const STEP_META: Record<
  StepId,
  { index: number; label: string; heading: string; blurb: string }
> = {
  when: {
    index: 0,
    label: "When",
    heading: "When would you like the room?",
    blurb:
      "Pick your dates and hours first — we'll check the room is free and price it for you straight away.",
  },
  event: {
    index: 1,
    label: "Your event",
    heading: "Tell us about your event.",
    blurb: "Just enough for us to set the room up the way you need it.",
  },
  extras: {
    index: 2,
    label: "Add-ons",
    heading: "Anything else you'd like arranged?",
    blurb:
      "Optional. Add-ons are quoted and confirmed with you separately — they are not included in the amount shown.",
  },
  details: {
    index: 3,
    label: "Your details",
    heading: "Almost there — who shall we book this for?",
    blurb: "We'll send your confirmation and pro-forma invoice here.",
  },
};

// ─── Options ──────────────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  { value: "training", label: "Corporate training" },
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "meeting", label: "Team meeting" },
  { value: "coaching", label: "Coaching session" },
  { value: "other", label: "Something else" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((e) => e.value) as [
  EventType,
  ...EventType[],
];

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((e) => e.value === value)?.label ?? value;
}

export const OPTIONAL_EXTRAS = [
  "Tea/Coffee Service",
  "Bottled Water",
  "Lunch Coordination",
  "Flipchart And Markers",
  "Printing And Photocopying",
  "Event Photography",
  "On-Site Technical Support",
  "Registration Desk Assistance",
] as const;

// ─── Limits ───────────────────────────────────────────────────────────────────

export const MAX_PARTICIPANTS = 24; // the room seats 24
export const MIN_DURATION_MINUTES = 60;
export const MAX_DURATION_HOURS = 12;
export const MAX_DAYS = 31;

// ─── Primitives ───────────────────────────────────────────────────────────────

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Nigerian mobile: 0803…, +234803…, 234803… — checked after stripping separators. */
const NG_PHONE = /^(?:\+?234|0)[7-9][01]\d{8}$/;

/** "HH:mm" → minutes since midnight. Returns null for anything malformed. */
export function timeToMinutes(value: string | undefined): number | null {
  if (!value || !HHMM.test(value)) return null;
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

/** One booked day and its hours. Dates are "YYYY-MM-DD", times "HH:mm". */
export interface DaySchedule {
  date: string;
  startTime: string;
  endTime: string;
}

/** Local calendar date as "YYYY-MM-DD" — never via toISOString(), which is UTC. */
export function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as a local date (not UTC midnight, which can shift a day). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sortDays<T extends { date: string }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * True when the dates form an unbroken run. The multi-day discount in
 * the multi-day discount is written for *consecutive* days, so a Mon/Wed/Fri
 * booking should not receive it.
 */
export function areConsecutive(dates: string[]): boolean {
  if (dates.length < 2) return false;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(`${sorted[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${sorted[i]}T00:00:00Z`);
    if (curr - prev !== 86_400_000) return false;
  }
  return true;
}

/** Midnight today in Africa/Lagos, as a local Date. Lagos is UTC+1, no DST. */
export function lagosToday(): Date {
  const now = new Date();
  const lagos = new Date(now.getTime() + (60 + now.getTimezoneOffset()) * 60_000);
  return new Date(lagos.getFullYear(), lagos.getMonth(), lagos.getDate());
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const bookingSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(120, "That name looks too long"),
    organisation: z
      .string()
      .trim()
      .max(160, "That organisation name looks too long")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s\-()]/g, ""))
      .refine(
        (s) => NG_PHONE.test(s),
        "Enter a Nigerian number, e.g. 0803 000 0000 or +234 803 000 0000"
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),
    eventType: z.enum(EVENT_TYPE_VALUES, {
      message: "Please choose an event type",
    }),
    /**
     * One entry per day, each with its own hours — days need not be
     * consecutive, so "every Tuesday for four weeks" is a single booking.
     * required_error matters on the times: they are set via setValue, never
     * registered, so an unset value is `undefined` and would read "Required".
     */
    days: z
      .array(
        z.object({
          date: z.string().regex(ISO_DATE, "Invalid date"),
          startTime: z
            .string({ required_error: "Pick a start time" })
            .regex(HHMM, "Pick a start time"),
          endTime: z
            .string({ required_error: "Pick an end time" })
            .regex(HHMM, "Pick an end time"),
        }),
        { required_error: "Please choose at least one date" }
      )
      .min(1, "Please choose at least one date")
      .max(MAX_DAYS, `You can book up to ${MAX_DAYS} days at a time`),
    participants: z.coerce
      .number({ message: "Please enter a number" })
      .int("Whole numbers only")
      .min(1, "At least 1 participant")
      .max(MAX_PARTICIPANTS, `Our room seats up to ${MAX_PARTICIPANTS}`),
    // `.optional()` rather than `.default([])`: a default makes zod's input and
    // output types diverge, which react-hook-form's generics then reject.
    extras: z.array(z.string()).optional(),
    agreedToPolicy: z.literal(true, {
      message: "Please accept the cancellation policy to continue.",
    }),
  })
  .superRefine((d, ctx) => {
    if (!Array.isArray(d.days)) return;

    const today = toIsoDate(lagosToday());
    const seen = new Set<string>();

    d.days.forEach((day, i) => {
      if (!day || !ISO_DATE.test(day.date ?? "")) return;

      if (seen.has(day.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", i, "date"],
          message: "This date is listed twice",
        });
      }
      seen.add(day.date);

      if (day.date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", i, "date"],
          message: "That date has passed",
        });
      }

      const start = timeToMinutes(day.startTime);
      const end = timeToMinutes(day.endTime);
      if (start === null || end === null) return;

      const duration = end - start;
      if (duration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", i, "endTime"],
          message: "End time must be after start time",
        });
      } else if (duration < MIN_DURATION_MINUTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", i, "endTime"],
          message: "Bookings run for at least one hour",
        });
      } else if (duration > MAX_DURATION_HOURS * 60) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", i, "endTime"],
          message: `Single days are limited to ${MAX_DURATION_HOURS} hours — please contact us for longer sessions`,
        });
      }
    });
  });

export type BookingValues = z.infer<typeof bookingSchema>;

/**
 * Which fields each step is responsible for. `trigger(STEP_FIELDS[step])`
 * validates exactly that step. See the note at the top of this file about why
 * every cross-field rule must resolve to a step-1 path.
 */
export const STEP_FIELDS = {
  when: ["days"],
  event: ["eventType", "participants"],
  extras: [],
  details: ["fullName", "organisation", "phone", "email", "agreedToPolicy"],
} as const satisfies Record<StepId, readonly (keyof BookingValues)[]>;
