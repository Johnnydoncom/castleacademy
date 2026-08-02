"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useIsCompact } from "@/hooks/use-media-query";
import {
  bookingSchema,
  eventTypeLabel,
  sortDays,
  STEP_FIELDS,
  STEP_META,
  STEP_ORDER,
  timeToMinutes,
  type BookingValues,
  type DaySchedule,
  type EventType,
  type StepId,
} from "@/lib/booking-schema";
import { StepRail } from "./booking-form/step-rail";
import { StepWhen } from "./booking-form/step-when";
import { StepEvent } from "./booking-form/step-event";
import { StepExtras } from "./booking-form/step-extras";
import { StepDetails } from "./booking-form/step-details";
import type { CustomerProfile } from "./booking-form/auth-prompt";
import { QuotePanel } from "./booking-form/quote-panel";
import { QuoteBar } from "./booking-form/quote-bar";
import { Confirmation } from "./booking-form/confirmation";
import { useAvailability } from "./booking-form/use-availability";
import { useQuote } from "./booking-form/use-quote";
import type { View } from "./booking-form/types";

/**
 * The booking flow.
 *
 * Four steps rather than one long form, ordered so availability is settled and
 * the price is on screen before the customer is asked for anything personal.
 * It is still a single real <form> with real labels — the steps are a
 * presentation of it, not a replacement for it.
 *
 * Per-step validation calls `trigger(STEP_FIELDS[step])`, but with a resolver
 * `trigger` validates the ENTIRE schema and commits every resulting error — not
 * just the named fields. Two consequences, both handled here:
 *
 *   - Whether a step passes is decided by `getFieldState` on that step's own
 *     fields, never by `trigger`'s return value (which is false whenever any
 *     later step is still blank).
 *   - Errors are only rendered once the user has earned them — see `stepError`.
 *     Without that, step 4 greets you in red before you have typed anything.
 *
 * See the note at the top of `lib/booking-schema.ts`.
 */
const FORM_ID = "booking-form";

export function Booking() {
  const router = useRouter();
  // Must match the `lg:` variants used for the two-column layout below. A JS
  // breakpoint that disagrees with the CSS one leaves a dead band of widths
  // where neither the sidebar nor the sticky bar renders and the price vanishes.
  const isCompact = useIsCompact();
  const [view, setView] = React.useState<View>({ kind: "form" });
  const [step, setStep] = React.useState<StepId>("when");
  const [maxReached, setMaxReached] = React.useState(0);
  const [attempted, setAttempted] = React.useState<Set<StepId>>(() => new Set());
  /** Bumping this remounts the form subtree — a clean slate without reset(). */
  const [formKey, setFormKey] = React.useState(0);

  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    getFieldState,
    trigger,
    watch,
    formState: { errors, touchedFields },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: { participants: 12, extras: [], days: [] },
  });

  const days = (watch("days") ?? []) as DaySchedule[];
  const eventType = watch("eventType");
  const participants = watch("participants");
  const extras = watch("extras") ?? [];
  const agreedToPolicy = watch("agreedToPolicy");

  const dates = React.useMemo(() => days.map((d) => d.date), [days]);
  const availability = useAvailability(dates);
  /** A selected day whose availability we haven't received yet. */
  const missingAvailability = days.some((d) => !availability.byDate.has(d.date));

  const { state: quoteState, quote } = useQuote({
    days,
    participants: Number(participants),
  });

  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);

  React.useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((profile: CustomerProfile | null) => {
        if (profile) {
          setCustomer(profile);
          if (!watch("fullName")) setValue("fullName", profile.fullName, { shouldValidate: true });
          if (!watch("email")) setValue("email", profile.email, { shouldValidate: true });
          if (profile.phone && !watch("phone")) setValue("phone", profile.phone, { shouldValidate: true });
        }
      })
      .catch(() => {});
  }, [setValue, watch]);

  const handleAuthSuccess = React.useCallback(
    (profile: CustomerProfile) => {
      setCustomer(profile);
      setValue("fullName", profile.fullName, { shouldValidate: true });
      setValue("email", profile.email, { shouldValidate: true });
      if (profile.phone) setValue("phone", profile.phone, { shouldValidate: true });
    },
    [setValue]
  );

  const handleSignOut = React.useCallback(async () => {
    try {
      await fetch("/api/customer/login", { method: "DELETE" });
      setCustomer(null);
      toast.info("Signed out of customer account.");
    } catch {
      toast.error("Failed to sign out.");
    }
  }, []);

  /**
   * Default hours applied to every newly picked day. Kept in component state,
   * not on the form: it is an input convenience, not part of the booking.
   */
  const [defaultTimes, setDefaultTimes] = React.useState<{
    startTime?: string;
    endTime?: string;
  }>({});

  const setDays = React.useCallback(
    (next: DaySchedule[]) =>
      setValue("days", sortDays(next), { shouldValidate: true, shouldDirty: true }),
    [setValue]
  );

  /** Adding a date seeds it with the shared hours; removing one drops it. */
  const handleDatesChange = (nextDates: string[]) => {
    const existing = new Map(days.map((d) => [d.date, d]));
    setDays(
      nextDates.map(
        (date) =>
          existing.get(date) ?? {
            date,
            startTime: defaultTimes.startTime ?? "",
            endTime: defaultTimes.endTime ?? "",
          }
      )
    );
  };

  const handleChangeDay = (date: string, patch: Partial<DaySchedule>) =>
    setDays(days.map((d) => (d.date === date ? { ...d, ...patch } : d)));

  const handleRemoveDay = (date: string) =>
    setDays(days.filter((d) => d.date !== date));

  /**
   * Changing the shared hours updates every day that still matches the previous
   * shared value, leaving days the customer has deliberately customised alone.
   */
  const handleDefaultTimesChange = (patch: { startTime?: string; endTime?: string }) => {
    const previous = defaultTimes;
    const next = { ...previous, ...patch };
    setDefaultTimes(next);
    setDays(
      days.map((d) => ({
        ...d,
        startTime:
          patch.startTime !== undefined &&
          (!d.startTime || d.startTime === previous.startTime)
            ? patch.startTime
            : d.startTime,
        endTime:
          patch.endTime !== undefined && (!d.endTime || d.endTime === previous.endTime)
            ? patch.endTime
            : d.endTime,
      }))
    );
  };

  /**
   * Rules that depend on server data and so can't live in the static schema.
   * Checked per day, because each day has its own opening hours and its own
   * existing bookings. Raised with setError, which RHF clears on the next
   * trigger of that field.
   */
  const checkAvailabilityConstraints = React.useCallback((): boolean => {
    if (missingAvailability && availability.status === "loading") return false;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const path = `days.${i}.endTime` as const;

      if (availability.closedDates.includes(day.date)) {
        setError(`days.${i}.date` as never, {
          type: "availability",
          message: "We're closed on this day.",
        });
        return false;
      }

      const window = availability.windowFor(day.date);
      if (window) {
        if (day.startTime && day.startTime < window.openTime) {
          setError(`days.${i}.startTime` as never, {
            type: "availability",
            message: `We open at ${window.openTime} on this day.`,
          });
          return false;
        }
        if (day.endTime && day.endTime > window.closeTime) {
          setError(path as never, {
            type: "availability",
            message: `We close at ${window.closeTime} on this day.`,
          });
          return false;
        }
      }

      const start = timeToMinutes(day.startTime);
      const end = timeToMinutes(day.endTime);
      if (start === null || end === null) continue;

      for (const slot of availability.busyFor(day.date)) {
        const busyStart = timeToMinutes(slot.startTime);
        const busyEnd = timeToMinutes(slot.endTime);
        if (busyStart === null || busyEnd === null) continue;
        if (start < busyEnd && end > busyStart) {
          setError(path as never, {
            type: "availability",
            message: "That time is already taken on this day.",
          });
          return false;
        }
      }
    }
    return true;
  }, [availability, days, missingAvailability, setError]);

  const stepIndex = STEP_META[step].index;
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  const enterStep = React.useCallback((next: StepId) => {
    setStep(next);
    setMaxReached((m) => Math.max(m, STEP_META[next].index));
    requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  /** Steps the user has actually tried to leave (or failed to submit from). */
  const markAttempted = React.useCallback(
    (s: StepId) => setAttempted((prev) => (prev.has(s) ? prev : new Set(prev).add(s))),
    []
  );

  /**
   * Whether an error may be shown.
   *
   * `trigger` populates errors for the whole schema, so by the time the user
   * reaches step 4 the contact fields already carry errors they have never seen
   * a field for. Showing them on arrival is the bug in the screenshot. Gate on
   * intent instead: the field has been touched (blurred), or the user has tried
   * to leave / submit this step. Independent of RHF's trigger semantics, so it
   * cannot regress if those change.
   */
  const stepError = (name: keyof BookingValues): string | undefined => {
    if (!(STEP_FIELDS[step] as readonly string[]).includes(name)) return undefined;
    if (!attempted.has(step) && !touchedFields[name]) return undefined;
    return errors[name]?.message as string | undefined;
  };

  /**
   * Error for one row of the day list. Shown once the step has been attempted,
   * or as soon as that row has both times set — choosing 3pm→1pm should say so
   * immediately rather than waiting for Continue.
   */
  const dayRowError = (i: number): string | undefined => {
    const row = (errors.days as unknown as Record<number, Record<string, { message?: string }>>)?.[i];
    const message =
      row?.date?.message ?? row?.startTime?.message ?? row?.endTime?.message;
    if (!message) return undefined;
    const day = days[i];
    const ready = Boolean(day?.startTime && day?.endTime);
    return attempted.has("when") || ready ? message : undefined;
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    markAttempted(step);
    if (fields.length > 0) {
      await trigger(fields as never, { shouldFocus: true });
      // `trigger`'s boolean reflects the WHOLE schema, so it is false whenever a
      // later step is incomplete. Read this step's fields directly instead —
      // getFieldState sees live state, unlike the `errors` render closure.
      if (fields.some((f) => getFieldState(f as never).error)) return;
    }
    if (step === "when" && !checkAvailabilityConstraints()) return;
    enterStep(STEP_ORDER[stepIndex + 1]);
  };

  const goBack = () => {
    if (stepIndex > 0) enterStep(STEP_ORDER[stepIndex - 1]);
  };

  /** Submit blocked by validation — send the user to the first offending step. */
  /** Submit blocked by validation — send the user to the first offending step. */
  const onInvalid = (formErrors: typeof errors) => {
    const target = STEP_ORDER.find((st) =>
      (STEP_FIELDS[st] as readonly string[]).some((f) => f in formErrors)
    );
    if (!target) return;
    markAttempted(target);
    if (target !== step) {
      enterStep(target);
      toast.error("Please check this step", {
        description: "A few details need fixing before we can reserve the room.",
      });
    }
  };

  const onSubmit = async (values: BookingValues) => {
    if (!checkAvailabilityConstraints()) {
      markAttempted("when");
      enterStep("when");
      return;
    }

    setView({ kind: "submitting" });

    const payload = { ...values, quoteId: quote?.quoteId ?? null };

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setView({ kind: "form" });

        if (res.status === 409) {
          markAttempted("when");
          enterStep("when");
          setError("days", {
            type: "conflict",
            message: data.message ?? "That time was just taken. Please pick another.",
          });
          availability.refresh();
          toast.error("Slot unavailable", { description: data.message });
          return;
        }

        if (res.status === 400 && data.error === "validation") {
          markAttempted("when");
          enterStep("when");
          toast.error("Please check your booking", { description: data.message });
          return;
        }

        throw new Error(`HTTP ${res.status}`);
      }

      // Should be impossible — both sides price from the same cache key — but if
      // it ever happens, the charged amount is the one that's true.
      if (quote && data.amount && data.amount !== quote.total) {
        console.error(
          `[Booking] Quoted ₦${quote.total} but charged ₦${data.amount}.`
        );
      }

      toast.success("Space reserved!", {
        description: "Redirecting to your booking confirmation page...",
      });

      router.push(`/booking/success?ref=${encodeURIComponent(data.reference)}`);
      return;
    } catch (err) {
      console.error("[Booking] Submission failed:", err);
      setView({ kind: "form" });
      toast.error("Submission failed", {
        description:
          "Something went wrong. Please try again or contact us directly.",
      });
    }
  };

  const bookAnother = () => {
    /**
     * `useForm` lives here, not inside the keyed subtree, so bumping `formKey`
     * remounts the inputs but leaves RHF's values intact — the previous
     * booking's dates, times and contact details would still be loaded. Reset
     * explicitly. This is safe now that the result lives in `view.result`
     * rather than being read back out of the form.
     */
    reset({ participants: 12, extras: [], days: [] });
    setDefaultTimes({});
    // Without this, step 4 greets the customer in red on their second booking,
    // because the first submit marked it attempted.
    setAttempted(new Set());
    setFormKey((k) => k + 1);
    setView({ kind: "form" });
    setStep("when");
    setMaxReached(0);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isSubmitting = view.kind === "submitting";
  const submitLabel =
    quoteState.status === "unavailable" ? "Request my booking" : "Reserve my space";

  const submitNow = handleSubmit(onSubmit, onInvalid);

  /**
   * Don't let the customer leave step 1 while we still have no availability for
   * a selected day: until it lands, the time pickers cannot know what is taken,
   * so a booked slot looks free and they'd only be stopped by a 409 at submit.
   *
   * Gated on *missing data*, not merely on "loading" — a refetch in flight over
   * days we already know about must not block, and a failed fetch must never
   * trap the customer on step 1 (the server re-validates at submit anyway).
   */
  const awaitingAvailability =
    step === "when" && missingAvailability && availability.status === "loading";

  const primaryAction = (
    <Button
      /**
       * Always type="button", never "submit".
       *
       * This element is reused across steps. If its type flipped to "submit" on
       * the last step, advancing from step 3 would submit the form: React
       * flushes the state update synchronously during the click, so the browser
       * then runs the click's default action against a button that has *become*
       * a submit button. The result was a phantom submit the instant step 4
       * appeared, which failed validation and painted every contact field red
       * before the user had typed anything. Submitting explicitly avoids the
       * whole class of problem — and means this works unchanged inside the
       * mobile sticky bar, which lives outside the <form>.
       */
      type="button"
      onClick={isLastStep ? () => void submitNow() : goNext}
      disabled={isSubmitting || awaitingAvailability}
      aria-busy={isSubmitting || awaitingAvailability}
      className="h-12 gap-2 rounded-full bg-gold px-7 text-royal-deep hover:bg-gold-soft disabled:opacity-60"
    >
      {isLastStep
        ? isSubmitting
          ? "Reserving…"
          : submitLabel
        : awaitingAvailability
          ? "Checking availability…"
          : "Continue"}
      {!isLastStep && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );

  const panelProps = {
    state: quoteState,
    days,
    participants: Number(participants),
    extras,
  };

  return (
    <section
      ref={sectionRef}
      id="book"
      // Extra bottom padding below `lg` so the sticky quote bar never covers the
      // last field. md:pb-32 is needed because md:py-28 would otherwise win.
      className="bg-ivory py-20 pb-32 md:py-28 md:pb-32 lg:pb-28"
      aria-labelledby="book-heading"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Reserve the room
          </p>
          <h2
            id="book-heading"
            className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl"
          >
            Book your space, <span className="text-gold">price and all</span>.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Four short steps. You&apos;ll see exactly what it costs before you
            enter any personal details.
          </p>
        </div>

        {view.kind === "success" ? (
          <div className="mt-12">
            <Confirmation result={view.result} onBookAnother={bookAnother} />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            {/* ── The form ───────────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-3xl border border-border bg-cream shadow-xl shadow-royal/5">
              <div className="relative overflow-hidden bg-royal-deep px-6 py-5 md:px-8">
                <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
                <div className="relative">
                  <StepRail
                    current={step}
                    maxReached={maxReached}
                    onNavigate={(s) => enterStep(s)}
                  />
                  <Progress
                    value={((stepIndex + 1) / STEP_ORDER.length) * 100}
                    aria-hidden="true"
                    className="mt-4 h-1 bg-white/10 lg:hidden"
                  />
                </div>
              </div>

              <form
                key={formKey}
                id={FORM_ID}
                onSubmit={handleSubmit(onSubmit, onInvalid)}
                noValidate
                // Enter in a text field advances rather than submitting early.
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !isLastStep &&
                    (e.target as HTMLElement).tagName === "INPUT"
                  ) {
                    e.preventDefault();
                    void goNext();
                  }
                }}
                className="p-6 pb-8 md:p-8"
              >
                <h3
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-xl leading-snug text-ink outline-none md:text-2xl"
                >
                  {STEP_META[step].heading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {STEP_META[step].blurb}
                </p>

                <div
                  key={step}
                  className="mt-7 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  {step === "when" && (
                    <StepWhen
                      days={days}
                      onDatesChange={handleDatesChange}
                      onChangeDay={handleChangeDay}
                      onRemoveDay={handleRemoveDay}
                      defaultStart={defaultTimes.startTime}
                      defaultEnd={defaultTimes.endTime}
                      onDefaultTimesChange={handleDefaultTimesChange}
                      availability={availability}
                      errors={{ days: stepError("days"), rowFor: dayRowError }}
                    />
                  )}

                  {step === "event" && (
                    <StepEvent
                      eventType={eventType}
                      onEventTypeChange={(v: EventType) =>
                        setValue("eventType", v, { shouldValidate: true })
                      }
                      participants={participants}
                      onParticipantsChange={(v) =>
                        setValue("participants", v, { shouldValidate: true })
                      }
                      errors={{
                        eventType: stepError("eventType"),
                        participants: stepError("participants"),
                      }}
                    />
                  )}

                  {step === "extras" && (
                    <StepExtras
                      selected={extras}
                      onToggle={(extra, checked) =>
                        setValue(
                          "extras",
                          checked
                            ? [...extras, extra]
                            : extras.filter((e) => e !== extra),
                          { shouldValidate: true }
                        )
                      }
                    />
                  )}

                  {step === "details" && (
                    <StepDetails
                      register={register}
                      errors={{
                        fullName: stepError("fullName"),
                        organisation: stepError("organisation"),
                        phone: stepError("phone"),
                        email: stepError("email"),
                        agreedToPolicy: stepError("agreedToPolicy"),
                      }}
                      agreedToPolicy={agreedToPolicy === true}
                      onPolicyChange={(v) =>
                        setValue("agreedToPolicy", v as true, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                      customer={customer}
                      onAuthSuccess={handleAuthSuccess}
                      onSignOut={handleSignOut}
                    />
                  )}
                </div>

                {/* The primary action lives in the sticky bar on mobile, so it
                    is rendered here only on desktop — one submit button total. */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  {stepIndex > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                      className="h-12 gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </Button>
                  ) : (
                    <span />
                  )}
                  {/* CSS-hidden below lg as well as JS-gated, so a wrong first
                      paint can never show a duplicate action. */}
                  <div className="hidden lg:flex">
                    {!isCompact && primaryAction}
                  </div>
                </div>

                {isLastStep && (
                  <p className="mt-4 text-center text-[11px] text-muted-foreground">
                    By submitting, you agree to be contacted about your booking.
                  </p>
                )}
              </form>
            </div>

            {/* ── The quote ──────────────────────────────────────────────── */}
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <QuotePanel {...panelProps} />
              <ul className="mt-6 space-y-3 px-2 text-sm">
                {[
                  { icon: Clock, label: "Instant response during business hours" },
                  { icon: ShieldCheck, label: "Secure Nomba payments (card & bank transfer)" },
                  { icon: MessageCircle, label: "Email + WhatsApp confirmation" },
                ].map((it) => (
                  <li
                    key={it.label}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    {it.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {isCompact && view.kind !== "success" && (
        <QuoteBar state={quoteState} action={primaryAction} panelProps={panelProps} />
      )}
    </section>
  );
}

