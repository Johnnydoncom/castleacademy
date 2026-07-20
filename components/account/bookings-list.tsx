"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  Loader2, Download, CreditCard, Mail, CalendarClock, FileText,
  ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

interface Booking {
  reference: string;
  invoice_number: string | null;
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
}

const EVENT_MAP: Record<string, string> = {
  training: "Corporate Training", workshop: "Workshop", seminar: "Seminar",
  meeting: "Team Meeting", coaching: "Coaching Session", other: "Other",
};

const naira = (n: number | null) => (n != null ? `₦${Number(n).toLocaleString("en-NG")}` : "—");
const fmtDate = (d: string) => { try { return format(new Date(d + "T00:00:00"), "EEE, d MMM yyyy"); } catch { return d; } };
const t5 = (t: string | null) => (t ? t.slice(0, 5) : "");

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; icon: typeof Clock; label: string }> = {
    confirmed: { c: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Confirmed" },
    pending: { c: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
    cancelled: { c: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Cancelled" },
    expired: { c: "bg-zinc-100 text-zinc-600 border-zinc-200", icon: CalendarX, label: "Expired" },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.c}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/customer/bookings")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resend = async (ref: string) => {
    setBusy(ref + ":resend");
    try {
      const res = await fetch(`/api/customer/bookings/${ref}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message || "Email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally { setBusy(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-cream p-10 text-center">
        <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <h3 className="font-display text-lg text-foreground">No bookings yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">When you book a training space, it will show up here.</p>
        <Link href="/#book"><Button className="mt-5 rounded-full bg-gold text-royal-deep hover:bg-gold-soft">Book a space</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">My Bookings</h1>
        <Link href="/#book"><Button variant="outline" size="sm" className="rounded-full">+ New booking</Button></Link>
      </div>

      {bookings.map((b) => {
        const open = expanded === b.reference;
        const canPay = b.status === "pending" && b.payment_status !== "paid" && b.checkout_link;
        const isPaid = b.payment_status === "paid";
        const canReschedule = ["pending", "confirmed"].includes(b.status) && b.reschedule_status !== "requested";
        return (
          <div key={b.reference} className="overflow-hidden rounded-2xl border border-border bg-cream shadow-sm">
            <button onClick={() => setExpanded(open ? null : b.reference)} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-royal">{b.reference}</span>
                  <StatusBadge status={b.status} />
                  {isPaid && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Paid</span>}
                  {b.reschedule_status === "requested" && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 border border-violet-200">Reschedule pending</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {EVENT_MAP[b.event_type] || b.event_type} · {fmtDate(b.start_date)} · {t5(b.start_time)}–{t5(b.end_time)}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-foreground">{naira(b.invoice_total)}</p>
                <p className="text-xs text-muted-foreground">inc. VAT</p>
              </div>
              {open ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
            </button>

            {open && (
              <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 text-sm">
                    <Row label="Event">{EVENT_MAP[b.event_type] || b.event_type}</Row>
                    <Row label="Date(s)">{b.start_date === b.end_date ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`}</Row>
                    <Row label="Time">{t5(b.start_time)}–{t5(b.end_time)}</Row>
                    <Row label="Participants">{b.participants}</Row>
                    {b.extras && b.extras.length > 0 && <Row label="Extras">{b.extras.join(", ")}</Row>}
                  </div>
                  <div className="space-y-1.5 rounded-xl bg-ivory p-3 text-sm">
                    <Row label="Subtotal">{naira(b.invoice_subtotal)}</Row>
                    <Row label="VAT">{naira(b.invoice_vat)}</Row>
                    {b.discount_applied && b.discount_applied !== "None" && <Row label="Discount">{b.discount_applied}</Row>}
                    <div className="mt-1 border-t border-border pt-1.5"><Row label="Total"><span className="font-bold">{naira(b.invoice_total)}</span></Row></div>
                    {b.reschedule_status === "requested" && (
                      <p className="mt-2 rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-700">
                        Reschedule requested to {b.reschedule_date && fmtDate(b.reschedule_date)} {t5(b.reschedule_start_time)}–{t5(b.reschedule_end_time)} — awaiting review.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canPay && (
                    <a href={b.checkout_link!} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"><CreditCard className="mr-1.5 h-4 w-4" />Pay Now — {naira(b.invoice_total)}</Button>
                    </a>
                  )}
                  <a href={`/api/customer/invoice/${b.reference}?type=invoice`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-full"><FileText className="mr-1.5 h-4 w-4" />Invoice PDF</Button>
                  </a>
                  {isPaid && (
                    <a href={`/api/customer/invoice/${b.reference}?type=receipt`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-full"><Download className="mr-1.5 h-4 w-4" />Receipt PDF</Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busy === b.reference + ":resend"} onClick={() => resend(b.reference)}>
                    {busy === b.reference + ":resend" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
                    Email me {isPaid ? "receipt" : "invoice"}
                  </Button>
                  {canReschedule && <RescheduleDialog booking={b} onDone={load} />}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

function RescheduleDialog({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [openDlg, setOpenDlg] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customer/bookings/${booking.reference}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", date, startTime, endTime, reason }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(d.message || "Reschedule requested");
      setOpenDlg(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={openDlg} onOpenChange={setOpenDlg}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full"><CalendarClock className="mr-1.5 h-4 w-4" />Request reschedule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Request a reschedule</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Free rescheduling is available more than 7 days before your event. We&apos;ll review and confirm your new slot.
        </p>
        <div className="space-y-3">
          <Field label="New date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><TimePicker value={startTime} onChange={setStartTime} placeholder="Start" /></Field>
            <Field label="End time"><TimePicker value={endTime} onChange={setEndTime} placeholder="End" /></Field>
          </div>
          <Field label="Reason" hint="optional"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. schedule clash" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenDlg(false)}>Cancel</Button>
          <Button className="bg-gold text-royal-deep hover:bg-gold-soft" disabled={saving || !date || !startTime || !endTime} onClick={submit}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
