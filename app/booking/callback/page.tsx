"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
  paidAt: string | null;
}

const EVENT_TYPE_MAP: Record<string, string> = {
  training: "Corporate Training",
  workshop: "Workshop",
  seminar: "Seminar",
  meeting: "Team Meeting",
  coaching: "Coaching Session",
  other: "Other",
};

export default function BookingCallbackPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!ref) {
      setError("No booking reference provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/booking/status?ref=${encodeURIComponent(ref)}`);
      if (res.status === 404) {
        setError("Booking not found. Please check your reference.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Unable to fetch booking status. Please try again.");
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

  // Auto-poll if payment is still pending (webhook may arrive seconds after redirect)
  useEffect(() => {
    if (!booking) return;
    if (booking.paymentStatus === "paid") return; // already confirmed — stop polling
    if (pollCount >= 6) return; // max 6 polls (30 seconds)

    const timer = setTimeout(() => {
      setPollCount((c) => c + 1);
      fetchStatus();
    }, 5000);

    return () => clearTimeout(timer);
  }, [booking, pollCount, fetchStatus]);

  const formatDate = (date: string) => {
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("en-NG", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  const formatAmount = (amount: number | null) =>
    amount ? `₦${amount.toLocaleString()}` : null;

  // ── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#0d0d0d] font-medium">Checking payment status…</p>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-xl font-bold text-[#0d0d0d]">Something went wrong</h1>
          <p className="text-gray-600 text-sm">{error}</p>
          <Link
            href="/#book"
            className="inline-block mt-4 bg-[#0d0d0d] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Back to Booking
          </Link>
        </div>
      </div>
    );
  }

  // ── Payment Confirmed ────────────────────────────────────────────────────
  if (booking?.paymentStatus === "paid") {
    return (
      <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full space-y-6">
          {/* Success header */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#0d0d0d] px-8 py-6 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white text-2xl font-bold">Booking Confirmed!</h1>
              <p className="text-[#c9a84c] text-sm mt-1">Payment received successfully</p>
            </div>

            <div className="px-8 py-6 space-y-4">
              <div className="bg-[#f5f3ee] rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Booking Summary</p>
                <div className="space-y-2 text-sm">
                  <Row label="Booking Reference">
                    <span className="font-mono font-bold text-[#0d0d0d] text-base tracking-wider">
                      {booking.reference}
                    </span>
                  </Row>
                  <Row label="Name">{booking.fullName}</Row>
                  <Row label="Event">{EVENT_TYPE_MAP[booking.eventType] || booking.eventType}</Row>
                  <Row label="Date">
                    {booking.startDate === booking.endDate
                      ? formatDate(booking.startDate)
                      : `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}`}
                  </Row>
                  <Row label="Time">{booking.startTime} – {booking.endTime}</Row>
                  <Row label="Participants">{booking.participants} people</Row>
                  {booking.invoiceTotal && (
                    <Row label="Amount Paid">
                      <span className="font-bold text-green-700">{formatAmount(booking.invoiceTotal)}</span>
                    </Row>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800">
                  ⚠️ Non-Refundable: This booking cannot be cancelled or refunded.
                </p>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed">
                A confirmation email has been sent to you. If you have any questions, please contact us at{" "}
                <a href="mailto:thecastleacademyspace@gmail.com" className="text-[#c9a84c] underline">
                  thecastleacademyspace@gmail.com
                </a>
              </p>
            </div>

            <div className="bg-[#0d0d0d] px-8 py-4 flex gap-3">
              <a
                href={`https://wa.me/2349042222296`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#25d366] text-white text-center py-2.5 rounded-full text-sm font-semibold hover:bg-[#20b858] transition-colors"
              >
                WhatsApp Us
              </a>
              <Link
                href="/"
                className="flex-1 bg-white/10 text-white text-center py-2.5 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment Pending (webhook not yet received / payment in progress) ─────
  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#0d0d0d] px-8 py-6 text-center">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-full flex items-center justify-center mx-auto mb-3">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-white text-xl font-bold">Confirming your payment…</h1>
          <p className="text-[#c9a84c]/80 text-sm mt-1">This usually takes a few seconds</p>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="bg-[#f5f3ee] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Booking Reference</p>
            <p className="font-mono font-bold text-[#0d0d0d] text-lg tracking-wider">{booking?.reference}</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-800 leading-relaxed">
              We're waiting for payment confirmation from Nomba. This page will automatically
              update once your payment is verified.
            </p>
          </div>

          {pollCount >= 6 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-amber-800">Taking longer than expected?</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                If you completed the payment, it may take a few minutes to process. Check your email
                for a confirmation, or contact us on WhatsApp with your reference number.
              </p>
              <a
                href={`https://wa.me/2349042222296?text=Hi, I just paid for booking ${booking?.reference} but the confirmation page is still loading.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#25d366] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#20b858] transition-colors"
              >
                Contact us on WhatsApp
              </a>
            </div>
          )}

          <button
            onClick={() => { setPollCount(0); setLoading(true); fetchStatus(); }}
            className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-[#0d0d0d] font-medium text-right">{children}</span>
    </div>
  );
}
