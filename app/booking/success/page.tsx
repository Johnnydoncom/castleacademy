"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Calendar,
  Clock,
  Users,
  CreditCard,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Tag,
  Gift,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { CANCELLATION_SUMMARY_TEXT } from "@/lib/policy";

interface BookingStatus {
  reference: string;
  fullName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  participants: number;
  status: string;
  paymentStatus: string;
  invoiceTotal: number | null;
  checkoutLink: string | null;
  paidAt: string | null;
}

const EVENT_TYPE_MAP: Record<string, string> = {
  training: "Corporate Training",
  workshop: "Workshop",
  seminar: "Seminar",
  meeting: "Team Meeting",
  coaching: "Coaching Session",
  other: "Other Event",
};

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[#0d0d0d] font-medium text-sm">Loading confirmation…</p>
          </div>
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!ref) {
      setError("No booking reference provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/booking/status?ref=${encodeURIComponent(ref)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Booking not found. Please verify your reference number.");
        } else {
          setError("Failed to load booking details.");
        }
        setLoading(false);
        return;
      }

      const data: BookingStatus = await res.json();
      setBooking(data);
      setLoading(false);
    } catch {
      setError("Network error. Please try refreshing the page.");
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const copyRef = () => {
    if (booking?.reference) {
      navigator.clipboard.writeText(booking.reference);
      toast.success("Reference copied to clipboard!");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-NG", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number | null) =>
    amount ? `₦${Number(amount).toLocaleString()}` : null;

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#0d0d0d] font-medium text-sm">Retrieving your booking confirmation…</p>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 border border-amber-100">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] font-display">Booking Not Found</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{error || "We couldn't locate this booking."}</p>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/#book"
              className="w-full bg-[#0d0d0d] text-white py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Return to Booking Form
            </Link>
            <Link
              href="/"
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-full text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = booking.paymentStatus === "paid" || booking.status === "confirmed";

  return (
    <div className="min-h-screen bg-[#f5f3ee] py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Hero Card */}
        <div className="bg-[#0d0d0d] text-white rounded-3xl shadow-2xl overflow-hidden relative border border-[#c9a84c]/20">
          <div className="absolute inset-0 bg-[radial-[#c9a84c]/0.05] pointer-events-none" />
          
          <div className="px-6 py-10 md:px-12 md:py-14 text-center space-y-4">
            <div className="w-16 h-16 bg-[#c9a84c] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#c9a84c]/20 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-9 h-9 text-[#0d0d0d]" />
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              {isPaid ? "Booking Confirmed!" : "Thank You! Your Space is Reserved."}
            </h1>

            <p className="text-[#c9a84c] text-sm md:text-base font-medium max-w-lg mx-auto">
              {isPaid
                ? "Payment received. We look forward to hosting your session at Castle Academy."
                : `We've emailed your confirmation details and invoice to your inbox.`}
            </p>

            {/* Reference Box */}
            <div className="pt-4 inline-flex flex-col items-center">
              <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
                Booking Reference
              </span>
              <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-2.5 backdrop-blur-sm">
                <span className="font-mono text-xl font-bold tracking-widest text-[#c9a84c]">
                  {booking.reference}
                </span>
                <button
                  onClick={copyRef}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                  title="Copy Reference"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Callout Banner */}
          {!isPaid && booking.checkoutLink && (
            <div className="bg-[#c9a84c] text-[#0d0d0d] px-6 py-5 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="font-bold text-base">Complete Payment to Confirm Slot</p>
                <p className="text-xs text-[#0d0d0d]/80 mt-0.5">
                  Amount due: <strong>{formatAmount(booking.invoiceTotal) || "Total Inc. VAT"}</strong> · Soft-held for 6 hours
                </p>
              </div>
              <a
                href={booking.checkoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#0d0d0d] text-white px-7 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-transform active:scale-95 shadow-md shrink-0"
              >
                Pay {formatAmount(booking.invoiceTotal)} Now <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}

          {isPaid && (
            <div className="bg-emerald-600 text-white px-6 py-4 md:px-12 text-center flex items-center justify-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-5 h-5" /> Payment Status: Paid &amp; Confirmed
            </div>
          )}
        </div>

        {/* Booking Summary Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold font-display text-[#0d0d0d] border-b border-gray-100 pb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#c9a84c]" /> Booking Summary
          </h2>

          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Booked By</span>
              <p className="font-semibold text-[#0d0d0d] text-base">{booking.fullName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Event Type</span>
              <p className="font-semibold text-[#0d0d0d] text-base">
                {EVENT_TYPE_MAP[booking.eventType] || booking.eventType}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date Range
              </span>
              <p className="font-medium text-[#0d0d0d]">
                {booking.startDate === booking.endDate
                  ? formatDate(booking.startDate)
                  : `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}`}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Session Hours
              </span>
              <p className="font-medium text-[#0d0d0d]">
                {booking.startTime} – {booking.endTime}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" /> Attendees
              </span>
              <p className="font-medium text-[#0d0d0d]">{booking.participants} participants</p>
            </div>

            {booking.invoiceTotal && (
              <div className="space-y-1">
                <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Total Payable (inc. VAT)
                </span>
                <p className="font-bold text-lg text-emerald-700">{formatAmount(booking.invoiceTotal)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Benefits & Policies Banner Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          
          {/* Cancellation Policy */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wider">
              <RefreshCw className="w-4 h-4 text-amber-700" /> Cancellation Policy
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              {CANCELLATION_SUMMARY_TEXT}
            </p>
          </div>

          {/* Early Booking Incentive */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs uppercase tracking-wider">
              <Tag className="w-4 h-4 text-emerald-700" /> Early Booking Offer
            </div>
            <p className="text-xs text-emerald-800/90 leading-relaxed">
              Enjoy a <strong>5% discount</strong> on your next booking when confirmed &amp; paid at least 14 days in advance.
            </p>
          </div>

          {/* Referral Reward */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs uppercase tracking-wider">
              <Gift className="w-4 h-4 text-blue-700" /> Referral Rewards
            </div>
            <p className="text-xs text-blue-800/90 leading-relaxed">
              Refer a friend or colleague and receive <strong>₦10,000 credit</strong> or <strong>1 free extra hour</strong>!
            </p>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/account"
            className="flex-1 min-w-[200px] text-center bg-[#0d0d0d] text-white py-3.5 px-6 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Manage in My Account →
          </Link>

          <a
            href={`https://wa.me/2349042222296?text=Hi, I just submitted booking ${booking.reference}.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[200px] text-center bg-[#25d366] text-white py-3.5 px-6 rounded-full text-sm font-semibold hover:bg-[#20b858] transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
          </a>

          <Link
            href="/#book"
            className="w-full md:w-auto text-center border border-gray-300 text-gray-700 py-3.5 px-6 rounded-full text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Book Another Session
          </Link>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500">
          Castle Academy · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos · Questions? Contact{" "}
          <a href="mailto:thecastleacademyspace@gmail.com" className="text-[#c9a84c] underline">
            thecastleacademyspace@gmail.com
          </a>
        </p>

      </div>
    </div>
  );
}
