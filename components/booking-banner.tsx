import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookingBanner() {
  return (
    <section id="book" className="bg-ivory py-20 md:py-28" aria-labelledby="booking-banner-heading">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        
        <div className="relative overflow-hidden rounded-3xl bg-royal p-8 text-white md:p-14 shadow-2xl shadow-royal/20 border border-white/10">
          <div className="grain absolute inset-0 opacity-30" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
          
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            
            {/* Left Content Column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Reserve in 4 Quick Steps
              </div>

              <h2
                id="booking-banner-heading"
                className="font-display text-3xl sm:text-4xl md:text-5xl leading-tight text-white"
              >
                Ready to book your <span className="text-gold">training space</span>?
              </h2>

              <p className="text-sm md:text-base leading-relaxed text-white/80 max-w-xl">
                Check real-time date availability, select your preferred session hours, and get an instant quote in Naira — all in under 2 minutes.
              </p>

              {/* Key Highlights */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {[
                  "Real-time availability check",
                  "Instant Naira quote calculator",
                  "6-hour soft hold on date reservation",
                  "Automatic invoice & receipt generation",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs md:text-sm text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-gold px-8 py-6 text-sm font-bold text-royal-deep hover:bg-gold-soft transition-transform active:scale-95 shadow-lg shadow-gold/20"
                >
                  <Link href="/booking" className="flex items-center gap-2">
                    Book Your Space Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 bg-transparent px-7 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#pricing">Explore Pricing &amp; Offers</a>
                </Button>
              </div>

              <p className="flex items-center gap-2 text-xs text-white/60 pt-2">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0" /> Secure payment via Paystack &amp; Flutterwave · 7.5% VAT applies
              </p>
            </div>

            {/* Right Card Callout Column */}
            <div className="relative rounded-2xl border border-white/15 bg-white/5 p-6 md:p-8 backdrop-blur-md space-y-6">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-gold font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Standard Rate
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-5xl text-white font-bold">₦100,000</span>
                  <span className="text-xs text-gold/80">(excl. VAT)</span>
                </div>
                <p className="text-xs text-white/70">For up to 3 hours of dedicated venue time</p>
              </div>

              <div className="h-px bg-white/10" />

              <div className="space-y-3 text-xs text-white/80">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Extra Hour</span>
                  <span className="font-semibold text-gold">₦30,000 / hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Capacity</span>
                  <span className="font-semibold text-white">Up to 24 Seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Early Booking Offer</span>
                  <span className="font-semibold text-emerald-400">5% Discount (14+ days)</span>
                </div>
              </div>

              <Link
                href="/booking"
                className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl text-xs transition-colors border border-white/20"
              >
                Launch Booking Form →
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
