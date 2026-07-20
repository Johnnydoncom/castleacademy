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
  const MAX_POLLS = 24; // 2 minutes at 5s intervals

  /**
   * Dual-track check:
   * 1. GET /api/booking/status — reflects webhook confirmation
   * 2. POST /api/booking/verify — actively asks Nomba if paid (bypasses webhook delay)
   * Whichever returns "paid" first wins.
   */
  const checkStatus = useCallback(async (): Promise<BookingStatus | null> => {
    if (!ref) return null;

    // Track 1: database status (set by webhook)
    const statusPromise = fetch(`/api/booking/status?ref=${encodeURIComponent(ref)}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

    // Track 2: active Nomba verification (confirms booking if paid, bypasses webhook)
    const verifyPromise = fetch(`/api/booking/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

    const [statusData, verifyData] = await Promise.all([statusPromise, verifyPromise]);

    // If either track shows confirmed, return the status data (it has the full booking)
    if (verifyData?.paymentStatus === "paid" || statusData?.paymentStatus === "paid") {
      // Re-fetch status to get fresh full booking data
      const fresh = await fetch(`/api/booking/status?ref=${encodeURIComponent(ref)}`)
        .then(r => r.ok ? r.json() : null).catch(() => null);
      return fresh || statusData;
    }

    return statusData;
  }, [ref]);

  const runCheck = useCallback(async () => {
    if (!ref) {
      setError("No booking reference provided.");
      setLoading(false);
      return;
    }

    try {
      const data = await checkStatus();
      if (!data) {
        setError("Booking not found. Please check your reference.");
        setLoading(false);
        return;
      }
      setBooking(data);
      setLoading(false);
    } catch {
      setError("Network error. Please try refreshing the page.");
      setLoading(false);
    }
  }, [ref, checkStatus]);

  // Initial load
  useEffect(() => {
    runCheck();
  }, [runCheck]);

  // Auto-poll until confirmed or max attempts reached
  useEffect(() => {
    if (!booking) return;
    if (booking.paymentStatus === "paid") return;
    if (pollCount >= MAX_POLLS) return;

    const timer = setTimeout(async () => {
      try {
        const data = await checkStatus();
        if (data) setBooking(data);
      } catch {
        // silent — keep polling
      }
      setPollCount((c) => c + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [booking, pollCount, checkStatus]);

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
    amount ? `₦${Number(amount).toLocaleString()}` : null;

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
                A confirmation email with your receipt has been sent to you. If you have any questions, please contact us at{" "}
                <a href="mailto:thecastleacademyspace@gmail.com" className="text-[#c9a84c] underline">
                  thecastleacademyspace@gmail.com
                </a>
              </p>

              <Link
                href="/account"
                className="block w-full rounded-full bg-[#c9a84c] py-2.5 text-center text-sm font-semibold text-[#0d0d0d] hover:bg-[#d9b95c] transition-colors"
              >
                Manage this booking in My Account →
              </Link>
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
  const pollsRemaining = MAX_POLLS - pollCount;
  const isTimedOut = pollCount >= MAX_POLLS;

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#0d0d0d] px-8 py-6 text-center">
          {isTimedOut ? (
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              ⚠️
            </div>
          ) : (
            <div className="w-16 h-16 bg-[#c9a84c] rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <h1 className="text-white text-xl font-bold">
            {isTimedOut ? "Payment Pending" : "Confirming your payment…"}
          </h1>
          <p className="text-[#c9a84c]/80 text-sm mt-1">
            {isTimedOut
              ? "We're still waiting for confirmation from Nomba"
              : `Checking with Nomba… (attempt ${pollCount + 1} of ${MAX_POLLS})`}
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="bg-[#f5f3ee] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Booking Reference</p>
            <p className="font-mono font-bold text-[#0d0d0d] text-lg tracking-wider">{booking?.reference}</p>
          </div>

          {!isTimedOut && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-800 leading-relaxed">
                We&apos;re verifying your payment with Nomba. This page checks automatically every 5 seconds.
              </p>
              {/* Progress bar */}
              <div className="mt-3 bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(pollCount / MAX_POLLS) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Up to {Math.ceil(pollsRemaining * 5 / 60)} minute{Math.ceil(pollsRemaining * 5 / 60) > 1 ? 's' : ''} remaining
              </p>
            </div>
          )}

          {isTimedOut && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-amber-800">Taking longer than expected?</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                If you completed the payment, your booking is likely confirmed — please check your email for a
                confirmation. You can also contact us on WhatsApp with your reference number.
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
            onClick={() => {
              setPollCount(0);
              setLoading(true);
              runCheck();
            }}
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
