"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Loader2, ArrowLeft } from "lucide-react";

/**
 * Combined sign-in / register card shown on /account when the visitor has no
 * customer session. On success it refreshes so the server layout re-renders
 * the authenticated dashboard.
 */
export function AccountAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-cream p-8 shadow-xl shadow-royal/5">
          <div className="mb-6 text-center">
            <img src="/logo.png" alt="Castle Academy" className="mx-auto mb-4 h-10 w-auto" />
            <h1 className="font-display text-2xl text-foreground">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Manage your bookings, invoices and profile."
                : "Track bookings, download invoices and manage reschedules."}
            </p>
          </div>

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
            <Field label="Password" hint={mode === "register" ? "min 8 characters" : undefined}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
            </Field>

            <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New to Castle Academy?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-royal underline underline-offset-2 hover:text-gold"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Booked as a guest before? Sign up with the same email to see those bookings.
        </p>
      </div>
    </div>
  );
}
