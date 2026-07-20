"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Loader2, Save, Lock, User, ShieldCheck } from "lucide-react";

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.fullName || "");
        setEmail(d.email || "");
        setPhone(d.phone || "");
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSavingProfile(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Password changed successfully");
      setCurrentPassword(""); setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally { setSavingPw(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal details and account security.
        </p>
      </div>

      {/* ── Personal details ── */}
      <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-cream shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Personal Details</h2>
            <p className="text-xs text-muted-foreground">Your name and contact information</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Phone number" hint="optional">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 000 0000"
              />
            </Field>
          </div>
          <Field label="Email address" hint="cannot be changed">
            <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
          </Field>
          <div className="pt-1">
            <Button
              type="submit"
              disabled={savingProfile}
              className="rounded-full bg-gold text-royal-deep hover:bg-gold-soft gap-2"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={savePassword} className="rounded-2xl border border-border bg-cream shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Security</h2>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Field>
            <Field label="New password" hint="min 8 characters">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </Field>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose a strong password with at least 8 characters. We recommend a mix of letters, numbers and symbols.
            </p>
          </div>
          <div className="pt-1">
            <Button
              type="submit"
              disabled={savingPw || !currentPassword || !newPassword}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 gap-2"
            >
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update password
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
