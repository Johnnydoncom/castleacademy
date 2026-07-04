import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-royal text-primary-foreground grain">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-royal-deep blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-8 md:py-24 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Training Space Booking
          </div>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[68px]">
            A professional space where{" "}
            <span className="text-gold">great learning</span> happens.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Comfort, technology and convenience in the heart of{" "}
            <span className="font-medium text-white">Lekki, Lagos</span>. World-class
            right here in Nigeria — no wahala, no distractions, just the room your
            training deserves.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-gold px-7 text-royal-deep hover:bg-gold-soft"
            >
              <a href="#book">
                Book Now <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#gallery">Explore the Space</a>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" /> Secure payment via
              Paystack &amp; Flutterwave
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gold" aria-hidden="true" /> Instant WhatsApp
              confirmation
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <Image
              src="/images/hero-training-room.jpg"
              alt="Interior of Castle Academy training room in Lekki, Lagos"
              className="h-[420px] w-full object-cover md:h-[540px]"
              width={1536}
              height={1152}
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-royal-deep/70 to-transparent" />
          </div>
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-full bg-cream px-4 py-2.5 text-xs font-medium text-ink shadow-xl ring-1 ring-royal-deep/10">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Available today · 9am – 6pm
          </div>
          <div className="absolute -top-4 right-4 rounded-xl bg-cream px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-royal-deep shadow-lg ring-1 ring-royal-deep/10">
            <span className="font-semibold">Seats 24</span> · Classroom setup
          </div>
        </div>
      </div>
    </section>
  );
}
