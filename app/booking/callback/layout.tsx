import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmation — Castle Academy",
  description: "Your Castle Academy booking payment confirmation.",
};

export default function BookingCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
