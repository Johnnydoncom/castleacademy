import Link from "next/link";
import { ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Booking } from "@/components/booking";

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-royal-deep text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gold-soft hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <Link href="/" aria-label="Castle Academy Home">
            <Logo tone="onDark" className="h-9 md:h-11" />
          </Link>

          <Link
            href="/account"
            className="text-xs font-medium uppercase tracking-[0.16em] text-white/70 hover:text-gold transition-colors hidden sm:inline-block"
          >
            My Account
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Booking />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-cream py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-5 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-ink/80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-gold" /> Guaranteed Space Hold
            </span>
            <span>·</span>
            <a
              href="https://wa.me/2349042222296"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#25d366] hover:underline font-semibold"
            >
              <MessageCircle className="w-4 h-4" /> Need Help? Chat on WhatsApp
            </a>
          </div>
          <p>© {new Date().getFullYear()} Castle Academy · 29b Olorunnimbe Street, Ikeja, Lagos</p>
        </div>
      </footer>
    </div>
  );
}
