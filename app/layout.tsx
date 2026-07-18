import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppFAB } from "@/components/whatsapp-fab";

export const metadata: Metadata = {
  metadataBase: new URL("https://castleacademy.ng"),
  title: {
    default: "Castle Academy | Premium Training Space Booking, Ikeja Lagos",
    template: "%s | Castle Academy",
  },
  description:
    "Book Castle Academy — a modern, fully equipped training venue in Ikeja, Lagos. Seats 24, smart TV, high-speed Wi-Fi, uninterrupted power. Hassle-free bookings from ₦100,000.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Castle Academy | Premium Training Space Booking, Ikeja Lagos",
    description:
      "A professional space where great learning happens. Book Nigeria's most comfortable training venue in Ikeja, Lagos in minutes.",
    url: "https://castleacademy.ng",
    siteName: "Castle Academy",
    type: "website",
    locale: "en_NG",
    images: [
      {
        url: "/images/hero-training-room.jpg",
        width: 1200,
        height: 630,
        alt: "Castle Academy training room in Ikeja, Lagos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Castle Academy | Premium Training Space Booking, Ikeja Lagos",
    description:
      "A professional space where great learning happens. Book Nigeria's most comfortable training venue in minutes.",
    images: [
      "/images/hero-training-room.jpg",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
        />
        <meta name="apple-mobile-web-app-title" content="Castle Academy" />
      </head>
      <body>
        {children}
        <WhatsAppFAB />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
