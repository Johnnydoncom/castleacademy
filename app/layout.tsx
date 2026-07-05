import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
        url: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f1db1d4-e9e5-4952-b47e-92aa1ce2a4cc/id-preview-107d77e7--16880686-f885-4891-a281-8418e17cabd2.lovable.app-1783026353081.png",
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
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f1db1d4-e9e5-4952-b47e-92aa1ce2a4cc/id-preview-107d77e7--16880686-f885-4891-a281-8418e17cabd2.lovable.app-1783026353081.png",
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
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
