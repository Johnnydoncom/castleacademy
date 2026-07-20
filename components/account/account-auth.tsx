"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

type Mode = "login" | "register" | "forgot";

/**
 * Combined sign-in / register / forgot-password card shown on /account when the
 * visitor has no customer session. On login/register success it refreshes so the
 * server layout re-renders the authenticated dashboard.
 */
export function AccountAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/customer/password/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Something went wrong");
        setForgotSent(true);
        return;
      }

      const url = mode === "login" ? "/api/customer/login" : "/api/customer/register";
      const payload =
        mode === "login" ? { email, password } : { fullName, email, phone, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const goto = (m: Mode) => {
    setMode(m);
    setForgotSent(false);
    setPassword("");
  };

  const title =
    mode === "login" ? "Sign in to your account" : mode === "register" ? "Create your account" : "Reset your password";
  const subtitle =
    mode === "login"
      ? "Manage your bookings, invoices and profile."
      : mode === "register"
        ? "Track bookings, download invoices and manage reschedules."
        : "Enter your email and we'll send you a reset link.";

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-cream p-8 shadow-xl shadow-royal/5">
          <div className="mb-6 text-center">
            <img src="/logo.png" alt="Castle Academy" className="mx-auto mb-4 h-10 w-auto" />
            <h1 className="font-display text-2xl text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {mode === "forgot" && forgotSent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <MailCheck className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">Check your inbox</p>
              <p className="mt-1 text-sm text-emerald-700">
                If an account exists for <strong>{email}</strong>, we&apos;ve emailed a reset link. It expires in 1 hour.
              </p>
              <button onClick={() => goto("login")} className="mt-4 text-sm font-semibold text-royal underline underline-offset-2 hover:text-gold">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === "register" && (
                <Field label="Full name">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adaeze Okafor" required minLength={2} />
                </Field>
              )}
              <Field label="Email address">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </Field>
              {mode === "register" && (
                <Field label="Phone number" hint="optional">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" />
                </Field>
              )}
              {mode !== "forgot" && (
                <Field label="Password" hint={mode === "register" ? "min 8 characters" : undefined}>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
                </Field>
              )}

              {mode === "login" && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => goto("forgot")} className="text-xs font-medium text-muted-foreground hover:text-royal">
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "login" ? (
                  "Sign in"
                ) : mode === "register" ? (
                  "Create account"
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          {mode !== "forgot" && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "login" ? "New to Castle Academy?" : "Already have an account?"}{" "}
              <button
                onClick={() => goto(mode === "login" ? "register" : "login")}
                className="font-semibold text-royal underline underline-offset-2 hover:text-gold"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
          {mode === "forgot" && !forgotSent && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <button onClick={() => goto("login")} className="font-semibold text-royal underline underline-offset-2 hover:text-gold">
                Back to sign in
              </button>
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Booked as a guest before? Sign up with the same email to see those bookings.
        </p>
      </div>
    </div>
  );
}
