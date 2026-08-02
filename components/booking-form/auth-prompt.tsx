"use client";

import { useState } from "react";
import { User, LogIn, UserPlus, CheckCircle2, ShieldCheck, X, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

interface AuthPromptProps {
  customer: CustomerProfile | null;
  onAuthSuccess: (profile: CustomerProfile) => void;
  onSignOut: () => void;
}

export function AuthPrompt({ customer, onAuthSuccess, onSignOut }: AuthPromptProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const openAuth = (initialMode: "login" | "register") => {
    setMode(initialMode);
    setAuthError(null);
    setModalOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Login failed. Please check your credentials.");
        setSubmitting(false);
        return;
      }

      // Fetch fresh profile
      const meRes = await fetch("/api/customer/me");
      if (meRes.ok) {
        const profile: CustomerProfile = await meRes.json();
        onAuthSuccess(profile);
        toast.success(`Welcome back, ${profile.fullName}!`, {
          description: "Your details have been applied to this booking.",
        });
      }

      setModalOpen(false);
      setSubmitting(false);
    } catch {
      setAuthError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Registration failed. Please check your inputs.");
        setSubmitting(false);
        return;
      }

      // Fetch fresh profile
      const meRes = await fetch("/api/customer/me");
      if (meRes.ok) {
        const profile: CustomerProfile = await meRes.json();
        onAuthSuccess(profile);
        toast.success(`Account created! Welcome, ${profile.fullName}!`, {
          description: "Your details have been applied to this booking.",
        });
      }

      setModalOpen(false);
      setSubmitting(false);
    } catch {
      setAuthError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  // ── 1. SIGNED-IN STATE BADGE ────────────────────────────────────────────────
  if (customer) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-emerald-900">Signed in as {customer.fullName}</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                Account Active
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              ({customer.email}) · This booking will be saved to your account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium self-start sm:self-auto shrink-0"
        >
          Sign Out / Switch
        </button>
      </div>
    );
  }

  // ── 2. GUEST PROMPT CARD ────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl border border-gold/30 bg-amber-50/60 p-4 md:p-5 text-amber-950 space-y-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/20 text-royal-deep flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-5 h-5 text-gold" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-ink">Want to save and manage this booking?</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Sign in or create an account to track booking status, view invoice PDFs, and request reschedules anytime in <strong>My Account</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => openAuth("login")}
            className="rounded-full bg-royal text-white hover:bg-royal-deep text-xs font-semibold h-8 gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" /> Log In
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openAuth("register")}
            className="rounded-full border-royal/30 text-royal hover:bg-royal/10 text-xs font-semibold h-8 gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </Button>

          <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline-block">
            Or continue below as Guest
          </span>
        </div>
      </div>

      {/* ── 3. INLINE AUTH MODAL DIALOG ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-5 border border-border relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" /> Customer Portal
              </div>
              <h3 className="font-display text-2xl font-bold text-ink">
                {mode === "login" ? "Sign In to Your Account" : "Create a Customer Account"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "login"
                  ? "Sign in to associate this booking with your profile."
                  : "Register in 30 seconds to track all your training venue bookings."}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                {authError}
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === "login" && (
              <div
                className="space-y-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleLogin(e as any);
                  }
                }}
              >
                <Field label="Email Address">
                  <Input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Field label="Password">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Button
                  type="button"
                  onClick={handleLogin}
                  disabled={submitting}
                  className="w-full rounded-full bg-royal text-white hover:bg-royal-deep h-11 text-sm font-semibold"
                >
                  {submitting ? "Signing in…" : "Sign In & Apply to Booking"}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setMode("register");
                    }}
                    className="text-royal font-semibold hover:underline"
                  >
                    Create one now
                  </button>
                </p>
              </div>
            )}

            {/* REGISTER FORM */}
            {mode === "register" && (
              <div
                className="space-y-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleRegister(e as any);
                  }
                }}
              >
                <Field label="Full Name">
                  <Input
                    type="text"
                    required
                    placeholder="Adaeze Okafor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Field label="Email Address">
                  <Input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Field label="Phone Number" hint="optional">
                  <Input
                    type="tel"
                    placeholder="0803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Field label="Create Password">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </Field>

                <Button
                  type="button"
                  onClick={handleRegister}
                  disabled={submitting}
                  className="w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft h-11 text-sm font-bold"
                >
                  {submitting ? "Creating account…" : "Create Account & Apply to Booking"}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setMode("login");
                    }}
                    className="text-royal font-semibold hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
