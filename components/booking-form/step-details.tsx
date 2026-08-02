"use client";

import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field, errorId } from "@/components/field";
import { PolicyNotice } from "./policy-notice";
import { AuthPrompt, type CustomerProfile } from "./auth-prompt";
import type { BookingValues } from "@/lib/booking-schema";

export interface DetailErrors {
  fullName?: string;
  organisation?: string;
  phone?: string;
  email?: string;
  agreedToPolicy?: string;
}

export function StepDetails({
  register,
  errors,
  agreedToPolicy,
  onPolicyChange,
  customer,
  onAuthSuccess,
  onSignOut,
}: {
  register: UseFormRegister<BookingValues>;
  errors: DetailErrors;
  agreedToPolicy: boolean;
  onPolicyChange: (v: boolean) => void;
  customer?: CustomerProfile | null;
  onAuthSuccess?: (profile: CustomerProfile) => void;
  onSignOut?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Account Login / Register Prompt */}
      {onAuthSuccess && onSignOut && (
        <AuthPrompt
          customer={customer ?? null}
          onAuthSuccess={onAuthSuccess}
          onSignOut={onSignOut}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName} htmlFor="fullName">
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Adaeze Okafor"
            className="h-12"
            aria-required="true"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? errorId("fullName") : undefined}
            {...register("fullName")}
          />
        </Field>

        <Field
          label="Organisation"
          hint="optional"
          error={errors.organisation}
          htmlFor="organisation"
        >
          <Input
            id="organisation"
            autoComplete="organization"
            placeholder="Company or team"
            className="h-12"
            {...register("organisation")}
          />
        </Field>

        <Field label="Phone number" error={errors.phone} htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 000 0000"
            className="h-12"
            aria-required="true"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? errorId("phone") : undefined}
            {...register("phone")}
          />
        </Field>

        <Field label="Email address" error={errors.email} htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-12"
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? errorId("email") : undefined}
            {...register("email")}
          />
        </Field>
      </div>

      <PolicyNotice
        checked={agreedToPolicy}
        onCheckedChange={onPolicyChange}
        error={errors.agreedToPolicy}
      />
    </div>
  );
}
