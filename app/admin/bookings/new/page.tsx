"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPES, OPTIONAL_EXTRAS } from "@/lib/booking-schema";

interface DayEntry {
  date: string;
  startTime: string;
  endTime: string;
}

const EMPTY_DAY: DayEntry = { date: "", startTime: "09:00", endTime: "17:00" };

function SectionTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-6 h-6 rounded-full bg-gold/20 text-gold inline-flex items-center justify-center text-xs font-bold shrink-0">
        {step}
      </span>
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
    </div>
  );
}

export default function NewBookingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Client details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organisation, setOrganisation] = useState("");

  // Event details
  const [eventType, setEventType] = useState("training");
  const [participants, setParticipants] = useState("1");

  // Schedule
  const [days, setDays] = useState<DayEntry[]>([{ ...EMPTY_DAY }]);

  // Add-ons
  const [extras, setExtras] = useState<string[]>([]);

  // Booking & payment
  const [status, setStatus] = useState("confirmed");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [invoiceSubtotal, setInvoiceSubtotal] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  /* ── Helpers ─────────────────────────────────────────────── */

  function addDay() {
    setDays((prev) => [...prev, { ...EMPTY_DAY }]);
  }

  function removeDay(idx: number) {
    setDays((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDay(idx: number, field: keyof DayEntry, value: string) {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  }

  function toggleExtra(extra: string) {
    setExtras((prev) =>
      prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]
    );
  }

  /* ── Submit ──────────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Please enter the client's full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 5) {
      toast.error("Please enter a phone number.");
      return;
    }
    for (const d of days) {
      if (!d.date) {
        toast.error("Please fill in all booking dates.");
        return;
      }
      if (!d.startTime || !d.endTime) {
        toast.error("Please fill in start and end times for each day.");
        return;
      }
      if (d.startTime >= d.endTime) {
        toast.error(`On ${d.date}: end time must be after start time.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          organisation: organisation.trim() || undefined,
          eventType,
          participants: Number(participants) || 1,
          extras,
          notes: notes.trim() || undefined,
          days,
          status,
          paymentStatus,
          invoiceTotal: invoiceTotal ? Number(invoiceTotal) : undefined,
          invoiceSubtotal: invoiceSubtotal ? Number(invoiceSubtotal) : undefined,
          paymentMethod: paymentStatus === "paid" ? "manual" : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create booking.");
        return;
      }

      toast.success(`Booking created! Reference: ${data.reference}`);
      router.push("/admin/bookings");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Link>
        </div>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2.5">
            <CalendarPlus className="h-6 w-6 text-gold" />
            Create Manual Booking
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            Create a booking on behalf of a client. This bypasses the online
            payment flow — set the booking status and invoice amount manually below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── 1. Client Details ─────────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={1}>Client Details</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="nb-fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nb-fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ade Bello"
                  required
                  className="focus-visible:ring-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ade@company.com"
                  required
                  className="focus-visible:ring-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nb-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2348030000000"
                  required
                  className="focus-visible:ring-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-org">Organisation</Label>
                <Input
                  id="nb-org"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Company name (optional)"
                  className="focus-visible:ring-gold"
                />
              </div>
            </div>
          </section>

          {/* ── 2. Event Details ──────────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={2}>Event Details</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="nb-eventType">
                  Event Type <span className="text-destructive">*</span>
                </Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="nb-eventType" className="focus:ring-gold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((et) => (
                      <SelectItem key={et.value} value={et.value}>
                        {et.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-participants">
                  Participants <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nb-participants"
                  type="number"
                  min={1}
                  max={24}
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="focus-visible:ring-gold"
                />
                <p className="text-xs text-muted-foreground">Room capacity: 24 max</p>
              </div>
            </div>
          </section>

          {/* ── 3. Schedule ───────────────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={3}>Schedule</SectionTitle>
            <div className="space-y-3">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-4 bg-muted/40 rounded-lg border border-border/60"
                >
                  <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={day.date}
                      onChange={(e) => updateDay(idx, "date", e.target.value)}
                      className="focus-visible:ring-gold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start Time</Label>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(idx, "startTime", e.target.value)}
                      className="focus-visible:ring-gold w-36"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End Time</Label>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(idx, "endTime", e.target.value)}
                      className="focus-visible:ring-gold w-36"
                      required
                    />
                  </div>
                  {days.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeDay(idx)}
                      title="Remove this day"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDay}
              className="mt-3 gap-1.5 text-xs border-dashed border-gold/50 text-gold hover:bg-gold/10 hover:text-royal-deep"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Day
            </Button>
          </section>

          {/* ── 4. Optional Add-ons ───────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={4}>Optional Add-ons</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_EXTRAS.map((extra) => {
                const selected = extras.includes(extra);
                return (
                  <button
                    type="button"
                    key={extra}
                    onClick={() => toggleExtra(extra)}
                    className={`text-sm px-4 py-2 rounded-full border transition-all ${
                      selected
                        ? "bg-gold text-royal-deep border-gold font-semibold"
                        : "border-border text-muted-foreground hover:border-gold/50 hover:text-foreground"
                    }`}
                  >
                    {extra}
                  </button>
                );
              })}
            </div>
            {extras.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Selected: {extras.join(", ")}
              </p>
            )}
          </section>

          {/* ── 5. Booking & Payment ──────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={5}>Booking &amp; Payment</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="nb-status">Booking Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="nb-status" className="focus:ring-gold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-paymentStatus">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger id="nb-paymentStatus" className="focus:ring-gold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-invoiceSubtotal">Subtotal (₦, ex-VAT)</Label>
                <Input
                  id="nb-invoiceSubtotal"
                  type="number"
                  min={0}
                  value={invoiceSubtotal}
                  onChange={(e) => setInvoiceSubtotal(e.target.value)}
                  placeholder="e.g. 100000"
                  className="focus-visible:ring-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-invoiceTotal">Total Amount (₦, inc-VAT)</Label>
                <Input
                  id="nb-invoiceTotal"
                  type="number"
                  min={0}
                  value={invoiceTotal}
                  onChange={(e) => setInvoiceTotal(e.target.value)}
                  placeholder="e.g. 107500"
                  className="focus-visible:ring-gold"
                />
              </div>
            </div>
          </section>

          {/* ── 6. Admin Notes ────────────────────────────────── */}
          <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
            <SectionTitle step={6}>Admin Notes</SectionTitle>
            <Textarea
              id="nb-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — not visible to the customer (e.g. referral source, special arrangements, offline payment details)."
              className="focus-visible:ring-gold resize-none h-28 text-sm"
            />
          </section>

          {/* ── Submit bar ────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 pb-8">
            <Link href="/admin/bookings">
              <Button
                type="button"
                variant="outline"
                className="border-border"
                disabled={submitting}
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              id="nb-submit"
              className="gap-2 bg-gold text-royal-deep hover:bg-gold/90 font-semibold min-w-[190px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Booking…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" />
                  Create Booking
                </>
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
