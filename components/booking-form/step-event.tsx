"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, errorId } from "@/components/field";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, MAX_PARTICIPANTS, type EventType } from "@/lib/booking-schema";

/**
 * Step 2 — what the event is and how many people.
 *
 * Event type is a card grid rather than a <select>: there are only six options,
 * they're all visible at a glance, and it's one tap on mobile instead of two.
 */
export function StepEvent({
  eventType,
  onEventTypeChange,
  participants,
  onParticipantsChange,
  errors,
}: {
  eventType?: EventType;
  onEventTypeChange: (v: EventType) => void;
  participants?: number;
  onParticipantsChange: (v: number) => void;
  errors: { eventType?: string; participants?: string };
}) {
  const count = Number.isFinite(participants) ? Number(participants) : 0;

  const step = (delta: number) => {
    const next = Math.min(MAX_PARTICIPANTS, Math.max(1, count + delta));
    onParticipantsChange(next);
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2.5 text-xs font-medium uppercase tracking-[0.12em] text-ink/70">
          Event type
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {EVENT_TYPES.map((option) => {
            const selected = eventType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onEventTypeChange(option.value)}
                aria-pressed={selected}
                className={cn(
                  "min-h-[3.25rem] rounded-xl border px-4 py-3 text-left text-sm font-medium leading-snug transition-colors",
                  selected
                    ? "border-gold bg-gold/10 text-ink"
                    : "border-border bg-muted/30 text-foreground hover:bg-muted/60"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {errors.eventType && (
          <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
            {errors.eventType}
          </p>
        )}
      </fieldset>

      <Field
        label="Expected participants"
        hint={`max ${MAX_PARTICIPANTS}`}
        error={errors.participants}
        htmlFor="participants"
        className="max-w-xs"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={count <= 1}
            aria-label="One fewer participant"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-muted/60 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <Input
            id="participants"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PARTICIPANTS}
            value={Number.isFinite(participants) ? participants : ""}
            onChange={(e) => onParticipantsChange(Number(e.target.value))}
            aria-required="true"
            aria-invalid={Boolean(errors.participants)}
            aria-describedby={errors.participants ? errorId("participants") : undefined}
            className="h-12 text-center text-base tabular-nums"
          />
          <button
            type="button"
            onClick={() => step(1)}
            disabled={count >= MAX_PARTICIPANTS}
            aria-label="One more participant"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-muted/60 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </Field>
    </div>
  );
}
