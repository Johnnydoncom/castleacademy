"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, Clock, MessageCircle, ShieldCheck } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field } from "@/components/field";
import { cn } from "@/lib/utils";

const bookingSchema = z
  .object({
    fullName: z.string().min(2, "Please enter your full name"),
    organisation: z.string().optional(),
    phone: z.string().min(7, "Please enter a valid Nigerian phone number"),
    email: z.string().email("Please enter a valid email address"),
    eventType: z.enum(["training", "workshop", "seminar", "meeting", "coaching", "other"], {
      message: "Please choose an event type",
    }),
    startDate: z.date({ message: "Please pick a start date" }),
    startTime: z.string().min(1, "Start time required"),
    endDate: z.date({ message: "Please pick an end date" }),
    endTime: z.string().min(1, "End time required"),
    participants: z.coerce
      .number({ message: "Please enter a number" })
      .min(1, "At least 1 participant")
      .max(24, "Our room seats up to 24"),
    extras: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      !isBefore(startOfDay(data.endDate), startOfDay(data.startDate)),
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    }
  );

type BookingValues = z.infer<typeof bookingSchema>;

const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

const OPTIONAL_EXTRAS = [
  "Tea/Coffee Service",
  "Bottled Water",
  "Lunch Coordination",
  "Flipchart And Markers",
  "Printing And Photocopying",
  "Event Photography",
  "On-Site Technical Support",
  "Registration Desk Assistance",
] as const;

export function Booking() {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { participants: 12 },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const eventType = watch("eventType");

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) setValue("startDate", range.from, { shouldValidate: true });
    if (range?.to) setValue("endDate", range.to, { shouldValidate: true });
    // If user picks same day twice, endDate equals startDate (valid single-day booking)
    if (range?.from && !range?.to) setValue("endDate", range.from, { shouldValidate: false });
  };

  const formatDateRange = () => {
    if (!startDate) return null;
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, "PPP");
    }
    return `${format(startDate, "PP")} → ${format(endDate, "PP")}`;
  };

  const onSubmit = async (values: BookingValues) => {
    const payload: Record<string, any> = {
      ...values,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: format(values.endDate, "yyyy-MM-dd"),
    };

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[Booking] Submission failed:", err);
      toast.error("Submission failed", {
        description: "Something went wrong. Please try again or contact us directly.",
      });
      return;
    }

    setSubmitSuccess(true);
    setDateRange(undefined);
    toast.success("Space reserved!", {
      description:
        "We'll send confirmation + payment instructions to your email and WhatsApp shortly.",
    });
    reset({ participants: 12 });
    setTimeout(() => setSubmitSuccess(false), 6000);
  };

  return (
    <section id="book" className="bg-ivory py-20 md:py-28" aria-labelledby="book-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-cream shadow-xl shadow-royal/5">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-royal-deep p-8 text-white md:p-12">
              <div className="absolute inset-0 grain opacity-30" />
              <div className="relative flex h-full flex-col">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
                  Reserve the room
                </p>
                <h2 id="book-heading" className="mt-3 font-display text-3xl leading-tight text-white md:text-4xl">
                  Book your training space in a few short fields.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                  Submit the form and we&apos;ll confirm availability, hold your slot,
                  and send secure payment instructions straight to your inbox — plus
                  a friendly WhatsApp note so nothing falls through the cracks.
                </p>

                <ul className="mt-8 space-y-4 text-sm">
                  {[
                    { icon: Clock, label: "Instant response during business hours" },
                    { icon: ShieldCheck, label: "Secure Paystack / Flutterwave payments" },
                    { icon: MessageCircle, label: "Auto WhatsApp booking confirmation" },
                  ].map((it) => (
                    <li key={it.label} className="flex items-start gap-3 text-white/85">
                      <it.icon className="mt-0.5 h-4 w-4 text-gold" aria-hidden="true" />
                      {it.label}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-10 text-xs text-white/60">
                  Submissions are logged securely and trigger an email + WhatsApp
                  confirmation to your team.
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 md:p-12" noValidate>
              {submitSuccess && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
                  ✅ Your booking request has been received! We&apos;ll be in touch shortly.
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Contact info */}
                <Field label="Full name" error={errors.fullName?.message}>
                  <Input id="fullName" placeholder="Adaeze Okafor" {...register("fullName")} aria-required="true" />
                </Field>
                <Field label="Organisation" hint="optional">
                  <Input id="organisation" placeholder="Company or team" {...register("organisation")} />
                </Field>
                <Field label="Phone number" error={errors.phone?.message}>
                  <Input id="phone" placeholder="+234 803 000 0000" {...register("phone")} aria-required="true" />
                </Field>
                <Field label="Email address" error={errors.email?.message}>
                  <Input id="email" type="email" placeholder="you@company.com" {...register("email")} aria-required="true" />
                </Field>

                {/* Event type */}
                <Field label="Event type" error={errors.eventType?.message}>
                  <Select
                    value={eventType}
                    onValueChange={(v) =>
                      setValue("eventType", v as BookingValues["eventType"], { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="eventType" aria-required="true">
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Corporate training</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="meeting">Team meeting</SelectItem>
                      <SelectItem value="coaching">Coaching session</SelectItem>
                      <SelectItem value="other">Something else</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Expected participants */}
                <Field
                  label="Expected participants"
                  error={errors.participants?.message}
                  hint="max 24"
                >
                  <Input id="participants" type="number" min={1} max={24} {...register("participants")} aria-required="true" />
                </Field>

                {/* Date range — full width */}
                <div className="sm:col-span-2">
                  <Field
                    label="Event dates"
                    error={errors.startDate?.message ?? errors.endDate?.message}
                    hint="single or multi-day"
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="dateRange"
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start bg-background text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                          aria-required="true"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                          {formatDateRange() ?? "Pick start → end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeSelect}
                          initialFocus
                          numberOfMonths={2}
                          className="p-3 pointer-events-auto"
                          disabled={{ before: new Date() }}
                        />
                        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                          Click a single day for a same-day booking, or drag to select a range.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </Field>
                </div>

                {/* Start time / End time */}
                <Field label="Start time" error={errors.startTime?.message}>
                  <TimePicker
                    id="startTime"
                    value={watch("startTime")}
                    onChange={(v) => setValue("startTime", v, { shouldValidate: true })}
                    placeholder="Pick start time"
                    aria-required={true}
                  />
                </Field>
                <Field label="End time" error={errors.endTime?.message}>
                  <TimePicker
                    id="endTime"
                    value={watch("endTime")}
                    onChange={(v) => setValue("endTime", v, { shouldValidate: true })}
                    placeholder="Pick end time"
                    aria-required={true}
                  />
                </Field>

                {/* Optional extras */}
                <div className="sm:col-span-2">
                  <Field label="Optional extras" hint="optional">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {OPTIONAL_EXTRAS.map((extra) => {
                        const id = `extra-${extra.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                        const checked = (watch("extras") ?? []).includes(extra);
                        return (
                          <label
                            key={extra}
                            htmlFor={id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60 has-[:checked]:border-gold has-[:checked]:bg-gold/5"
                          >
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                const current = watch("extras") ?? [];
                                setValue(
                                  "extras",
                                  isChecked
                                    ? [...current, extra]
                                    : current.filter((e) => e !== extra),
                                  { shouldValidate: true }
                                );
                              }}
                              className="border-border data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-royal-deep"
                            />
                            <span className="text-sm font-medium leading-tight text-foreground">
                              {extra}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="mt-8 w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft disabled:opacity-60"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Reserving…" : "Reserve My Space"}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                By submitting, you agree to be contacted about your booking.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
