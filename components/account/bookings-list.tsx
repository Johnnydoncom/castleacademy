"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  Loader2, Download, CreditCard, Mail, CalendarClock, FileText,
  ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, CalendarX,
  Sparkles, RefreshCw, AlertTriangle, Plus, ExternalLink, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Booking {
  reference: string;
  invoice_number: string | null;
  full_name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  participants: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  invoice_subtotal: number | null;
  invoice_vat: number | null;
  invoice_total: number | null;
  discount_applied: string | null;
  invoice_breakdown: string | null;
  checkout_link: string | null;
  extras: string[] | null;
  reschedule_status: string;
  reschedule_date: string | null;
  reschedule_start_time: string | null;
  reschedule_end_time: string | null;
  reschedule_reason: string | null;
  created_at: string;
}

type FilterTab = "all" | "upcoming" | "paid" | "cancelled";

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_MAP: Record<string, string> = {
  training: "Corporate Training",
  workshop: "Workshop",
  seminar: "Seminar",
  meeting: "Team Meeting",
  coaching: "Coaching Session",
  other: "Other",
};

// ─── Utilities ───────────────────────────────────────────────────────────────

const naira = (n: number | null) =>
  n != null ? `₦${Number(n).toLocaleString("en-NG")}` : "—";
const fmtDate = (d: string) => {
  try { return format(new Date(d + "T00:00:00"), "EEE d MMM yyyy"); }
  catch { return d; }
};
const t5 = (t: string | null) => (t ? t.slice(0, 5) : "");

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeCls: string;
  borderCls: string;
  icon: typeof Clock;
}> = {
  confirmed: {
    label: "Confirmed",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    borderCls: "border-l-emerald-500",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    borderCls: "border-l-amber-400",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    badgeCls: "bg-red-100 text-red-700 border-red-200",
    borderCls: "border-l-red-400",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    badgeCls: "bg-zinc-100 text-zinc-500 border-zinc-200",
    borderCls: "border-l-zinc-300",
    icon: CalendarX,
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = s.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      s.badgeCls
    )}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function PayBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  return null;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/customer/bookings")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // ── Filtered view ─────────────────────────────────────────────────────────

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") {
      const d = new Date(b.start_date + "T00:00:00");
      return ["pending", "confirmed"].includes(b.status) && d >= now;
    }
    if (activeTab === "paid") return b.payment_status === "paid";
    if (activeTab === "cancelled") return ["cancelled", "expired"].includes(b.status);
    return true;
  });

  // ── Summary stats ─────────────────────────────────────────────────────────

  const totalSpent = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.invoice_total || 0), 0);
  const upcomingCount = bookings.filter((b) => {
    const d = new Date(b.start_date + "T00:00:00");
    return ["pending", "confirmed"].includes(b.status) && d >= now;
  }).length;

  // ── Actions ───────────────────────────────────────────────────────────────

  const resend = async (ref: string) => {
    setBusy(ref + ":resend");
    try {
      const res = await fetch(`/api/customer/bookings/${ref}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message || "Email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally { setBusy(null); }
  };

  const generateCheckout = async (ref: string) => {
    setBusy(ref + ":checkout");
    try {
      const res = await fetch(`/api/customer/bookings/${ref}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_checkout" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Payment link ready — opening...");
      window.open(d.checkoutLink, "_blank", "noopener,noreferrer");
      load(); // refresh to show new checkout_link
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate payment link");
    } finally { setBusy(null); }
  };

  const confirmCancel = async (ref: string) => {
    setBusy(ref + ":cancel");
    try {
      const res = await fetch(`/api/customer/bookings/${ref}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Booking cancelled.");
      setCancelTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    } finally { setBusy(null); }
  };

  const downloadPdf = async (ref: string, type: "invoice" | "receipt") => {
    setBusy(ref + ":" + type);
    try {
      const res = await fetch(`/api/customer/invoice/${ref}?type=${type}`);
      if (!res.ok) {
        let err = "Failed to generate PDF";
        try { const d = await res.json(); if (d.error) err = d.error; } catch { /* ignore */ }
        throw new Error(err);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type === "invoice" ? "Invoice" : "Receipt"}-${ref}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setBusy(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">Loading your bookings…</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="rounded-2xl border border-dashed border-border bg-cream p-12">
          <CalendarClock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="font-display text-xl text-foreground">No bookings yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            When you book a training space, it will appear here with your invoices and status.
          </p>
          <Link href="/#book">
            <Button className="mt-6 rounded-full bg-gold text-royal-deep hover:bg-gold-soft gap-2">
              <Plus className="h-4 w-4" /> Book a space
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: bookings.length },
    { key: "upcoming", label: "Upcoming", count: upcomingCount },
    { key: "paid", label: "Paid", count: bookings.filter((b) => b.payment_status === "paid").length },
    { key: "cancelled", label: "Cancelled", count: bookings.filter((b) => ["cancelled", "expired"].includes(b.status)).length },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, manage and download documents for all your sessions.
          </p>
        </div>
        <Link href="/#book">
          <Button variant="outline" size="sm" className="rounded-full gap-2 shrink-0">
            <Plus className="h-3.5 w-3.5" /> New booking
          </Button>
        </Link>
      </div>

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatChip label="Total bookings" value={String(bookings.length)} />
        <StatChip label="Upcoming" value={String(upcomingCount)} accent />
        <StatChip label="Total paid" value={naira(totalSpent)} className="col-span-2 sm:col-span-1" />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === t.key
                ? "bg-cream text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === t.key ? "bg-gold/20 text-gold-soft" : "bg-muted text-muted-foreground"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Booking cards ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-cream/60 py-12 text-center">
          <p className="text-sm text-muted-foreground">No bookings in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const open = expanded === b.reference;
            const isPaid = b.payment_status === "paid";
            const isActive = ["pending", "confirmed"].includes(b.status);
            const canPay = isActive && !isPaid;
            const hasCheckoutLink = !!b.checkout_link;
            const canReschedule = isActive && b.reschedule_status !== "requested";
            const canCancel = b.status === "pending" && !isPaid;
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
            const isExpired = b.status === "expired";
            const isCancelled = ["cancelled", "expired"].includes(b.status);

            return (
              <div
                key={b.reference}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border bg-cream shadow-sm transition-shadow hover:shadow-md",
                  "border-l-4",
                  cfg.borderCls
                )}
              >
                {/* ── Card header (always visible, clickable) ── */}
                <button
                  onClick={() => setExpanded(open ? null : b.reference)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  {/* Left: details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-foreground/80">{b.reference}</span>
                      <StatusBadge status={b.status} />
                      <PayBadge status={b.payment_status} />
                      {b.reschedule_status === "requested" && (
                        <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                          Reschedule pending
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {EVENT_MAP[b.event_type] || b.event_type}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtDate(b.start_date)}{b.start_date !== b.end_date && ` → ${fmtDate(b.end_date)}`}
                      {" · "}{t5(b.start_time)}–{t5(b.end_time)}
                      {" · "}{b.participants} participant{b.participants !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Right: amount */}
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-base font-bold text-foreground">{naira(b.invoice_total)}</p>
                    <p className="text-[11px] text-muted-foreground">inc. VAT</p>
                  </div>

                  {open
                    ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
                </button>

                {/* ── Expanded panel ── */}
                {open && (
                  <div className="border-t border-border/60 px-5 pb-5 pt-4">
                    <div className="grid gap-5 sm:grid-cols-5">
                      {/* Booking details */}
                      <div className="sm:col-span-3 rounded-xl bg-ivory/60 p-4">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Booking Details</p>
                        <InfoRow label="Event type">{EVENT_MAP[b.event_type] || b.event_type}</InfoRow>
                        <InfoRow label="Date">
                          {b.start_date === b.end_date ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`}
                        </InfoRow>
                        <InfoRow label="Time">{t5(b.start_time)} – {t5(b.end_time)}</InfoRow>
                        <InfoRow label="Participants">{b.participants}</InfoRow>
                        {b.extras && b.extras.length > 0 && (
                          <InfoRow label="Extras">{b.extras.join(", ")}</InfoRow>
                        )}
                        {b.invoice_number && (
                          <InfoRow label="Invoice No.">{b.invoice_number}</InfoRow>
                        )}
                        {b.invoice_breakdown && (
                          <InfoRow label="Pricing">{b.invoice_breakdown}</InfoRow>
                        )}
                      </div>

                      {/* Invoice summary */}
                      <div className="sm:col-span-2 rounded-xl border border-border/60 bg-cream p-4">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Invoice Summary</p>
                        <InfoRow label="Subtotal">{naira(b.invoice_subtotal)}</InfoRow>
                        <InfoRow label="VAT">{naira(b.invoice_vat)}</InfoRow>
                        {b.discount_applied && b.discount_applied !== "None" && b.discount_applied !== "None (Fallback Calculation)" && (
                          <InfoRow label="Discount">{b.discount_applied}</InfoRow>
                        )}
                        <div className="mt-2 border-t border-border/60 pt-2">
                          <InfoRow label="Total">
                            <span className="text-base font-bold text-foreground">{naira(b.invoice_total)}</span>
                          </InfoRow>
                        </div>
                        <div className="mt-3">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Payment confirmed
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500">
                              <CalendarX className="h-3.5 w-3.5" /> Slot expired
                            </span>
                          ) : isCancelled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                              <XCircle className="h-3.5 w-3.5" /> Booking cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Clock className="h-3.5 w-3.5" /> Payment pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reschedule info */}
                    {b.reschedule_status === "requested" && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                        <p className="text-sm text-violet-800">
                          <span className="font-semibold">Reschedule pending review —</span>{" "}
                          requested to {b.reschedule_date && fmtDate(b.reschedule_date)},{" "}
                          {t5(b.reschedule_start_time)}–{t5(b.reschedule_end_time)}.
                          {b.reschedule_reason && ` Reason: "${b.reschedule_reason}"`}
                        </p>
                      </div>
                    )}

                    {/* Grace period warning for unpaid pending */}
                    {b.status === "pending" && !isPaid && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <p className="text-sm text-amber-800">
                          <span className="font-semibold">Payment required within 6 hours of booking.</span>{" "}
                          Unpaid bookings are automatically cancelled after the grace period.
                        </p>
                      </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {/* Pay Now — use existing link */}
                      {canPay && hasCheckoutLink && (
                        <a href={b.checkout_link!} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay Now — {naira(b.invoice_total)}
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </Button>
                        </a>
                      )}

                      {/* Generate fresh checkout link */}
                      {canPay && !hasCheckoutLink && (
                        <Button
                          size="sm"
                          disabled={busy === b.reference + ":checkout"}
                          onClick={() => generateCheckout(b.reference)}
                          className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
                        >
                          {busy === b.reference + ":checkout" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Generate payment link
                        </Button>
                      )}

                      {/* Invoice PDF */}
                      {!isCancelled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5"
                          onClick={() => downloadPdf(b.reference, "invoice")}
                          disabled={busy === b.reference + ":invoice"}
                        >
                          {busy === b.reference + ":invoice" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          Invoice PDF
                        </Button>
                      )}

                      {/* Receipt PDF — paid only */}
                      {isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5"
                          onClick={() => downloadPdf(b.reference, "receipt")}
                          disabled={busy === b.reference + ":receipt"}
                        >
                          {busy === b.reference + ":receipt" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Receipt PDF
                        </Button>
                      )}

                      {/* Email me */}
                      {!isCancelled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5"
                          disabled={busy === b.reference + ":resend"}
                          onClick={() => resend(b.reference)}
                        >
                          {busy === b.reference + ":resend" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          Email me {isPaid ? "receipt" : "invoice"}
                        </Button>
                      )}

                      {/* Reschedule */}
                      {canReschedule && (
                        <RescheduleDialog booking={b} onDone={load} />
                      )}

                      {/* Cancel */}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setCancelTarget(b)}
                        >
                          <Ban className="h-3.5 w-3.5" /> Cancel booking
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cancel confirmation dialog ── */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Cancel booking?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You are about to cancel booking <span className="font-mono font-semibold text-foreground">{cancelTarget?.reference}</span>.</p>
            <p>Since this booking is unpaid, no refund is required. This action cannot be undone.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep booking</Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 gap-2"
              disabled={busy === cancelTarget?.reference + ":cancel"}
              onClick={() => cancelTarget && confirmCancel(cancelTarget.reference)}
            >
              {busy === cancelTarget?.reference + ":cancel"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Ban className="h-4 w-4" />}
              Yes, cancel it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, accent, className }: { label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-cream px-4 py-3 shadow-sm",
      accent && "border-gold/30 bg-gold/5",
      className
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold", accent ? "text-gold" : "text-foreground")}>{value}</p>
    </div>
  );
}

// ─── Reschedule dialog ────────────────────────────────────────────────────────

function RescheduleDialog({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customer/bookings/${booking.reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", date, startTime, endTime, reason }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message || "Reschedule requested");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full gap-1.5"
        onClick={() => setOpen(true)}
      >
        <CalendarClock className="h-3.5 w-3.5" /> Request reschedule
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a reschedule</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Free rescheduling is available more than 7 days before your event. We&apos;ll review and confirm your new slot within 24 hours.
        </p>
        <div className="space-y-3">
          <Field label="New date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <TimePicker value={startTime} onChange={setStartTime} placeholder="Start" />
            </Field>
            <Field label="End time">
              <TimePicker value={endTime} onChange={setEndTime} placeholder="End" />
            </Field>
          </div>
          <Field label="Reason" hint="optional">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. schedule clash"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-gold text-royal-deep hover:bg-gold-soft"
            disabled={saving || !date || !startTime || !endTime}
            onClick={submit}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
