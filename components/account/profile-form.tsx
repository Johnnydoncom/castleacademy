"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Loader2, Save } from "lucide-react";

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
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSavingProfile(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      const res = await fetch("/api/customer/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSavingPw(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Profile</h1>

      <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-cream p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} /></Field>
          <Field label="Phone number"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" /></Field>
          <Field label="Email address" hint="cannot be changed">
            <Input value={email} disabled className="opacity-70" />
          </Field>
        </div>
        <Button type="submit" disabled={savingProfile} className="mt-5 rounded-full bg-gold text-royal-deep hover:bg-gold-soft gap-2">
          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes
        </Button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-border bg-cream p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></Field>
          <Field label="New password" hint="min 8 characters"><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></Field>
        </div>
        <Button type="submit" disabled={savingPw || !currentPassword || !newPassword} className="mt-5 rounded-full bg-foreground text-background hover:bg-foreground/90 gap-2">
          {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Update password
        </Button>
      </form>
    </div>
  );
}
