import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmed — Castle Academy",
  description: "Thank you for booking with Castle Academy. Your space is reserved.",
};

export default function BookingSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
