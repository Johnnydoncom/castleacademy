import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Training Room & Venue — Castle Academy",
  description:
    "Reserve classroom training space in Ikeja, Lagos. Real-time availability, instant quote calculator, and secure online reservation.",
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
