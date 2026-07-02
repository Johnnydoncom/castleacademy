import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Wifi,
  Snowflake,
  Volume2,
  Tv,
  Wand2,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  GraduationCap,
  Handshake,
  Presentation,
  Lightbulb,
  Star,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

import logoAsset from "@/assets/castle-academy-wordmark.png.asset.json";
import heroImg from "@/assets/hero-training-room.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import useCorporate from "@/assets/use-corporate.jpg";
import useWorkshop from "@/assets/use-workshop.jpg";
import useSeminar from "@/assets/use-seminar.jpg";
import useMeeting from "@/assets/use-meeting.jpg";
import useCourse from "@/assets/use-course.jpg";
import usePresentation from "@/assets/use-presentation.jpg";
import useCoaching from "@/assets/use-coaching.jpg";
import useStrategy from "@/assets/use-strategy.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        property: "og:image",
        content: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&h=630&fit=crop",
      },
    ],
  }),
  component: Landing,
});

/* ---------------- Layout primitives ---------------- */

const NAV_LINKS = [
  { href: "#why", label: "Why Castle" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how", label: "How it works" },
  { href: "#gallery", label: "Gallery" },
  { href: "#book", label: "Book" },
];

function Logo({ className, tone = "onLight" }: { className?: string; tone?: "onLight" | "onDark" }) {
  // The wordmark is gold-on-transparent. On light surfaces we drop it into a
  // noir tile so the gold reads with luxury contrast; on dark it sits naturally.
  if (tone === "onDark") {
    return (
      <img
        src={logoAsset.url}
        alt="The Castle Academy"
        className={cn("h-14 w-auto object-contain", className)}
        width={220}
        height={72}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-royal px-3 py-1.5 shadow-sm ring-1 ring-gold/20",
        className
      )}
    >
      <img
        src={logoAsset.url}
        alt="The Castle Academy"
        className="h-8 w-auto object-contain"
        width={140}
        height={40}
      />
    </span>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-gold/20 bg-royal-deep/95 backdrop-blur-xl shadow-lg shadow-royal-deep/20"
          : "border-b border-transparent bg-royal-deep"
      )}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 md:px-8 md:py-5">
        <a href="#top" className="flex items-center gap-3 group">
          <Logo tone="onDark" className="h-10 md:h-12" />
        </a>
        <nav className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-[13px] font-medium uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-gold after:absolute after:-bottom-1.5 after:left-1/2 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:left-0 hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button
            asChild
            className="hidden rounded-none border border-gold bg-transparent px-6 text-[12px] font-medium uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold hover:text-royal-deep md:inline-flex"
          >
            <a href="#book">Reserve · Book Now</a>
          </Button>
          <button
            className="rounded-md border border-white/20 p-2 text-white md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1">
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
            </div>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-gold/20 bg-royal-deep md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium uppercase tracking-[0.14em] text-white/80 hover:text-gold"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#book"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center border border-gold px-6 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-royal-deep"
            >
              Reserve · Book Now
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-royal text-primary-foreground grain">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-royal-deep blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-8 md:py-24 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">
            <Sparkles className="h-3.5 w-3.5" /> Training Space Booking
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
                Book Now <ArrowRight className="ml-1 h-4 w-4" />
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
              <ShieldCheck className="h-4 w-4 text-gold" /> Secure payment via
              Paystack & Flutterwave
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gold" /> Instant WhatsApp
              confirmation
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img
              src={heroImg}
              alt="Interior of Castle Academy training room in Lekki, Lagos"
              className="h-[420px] w-full object-cover md:h-[540px]"
              width={1536}
              height={1152}
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-royal-deep/70 to-transparent" />
          </div>
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-full bg-cream px-4 py-2.5 text-xs font-medium text-ink shadow-xl ring-1 ring-royal-deep/10">
            <span className="relative flex h-2.5 w-2.5">
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

/* ---------------- Why ---------------- */

const FEATURES = [
  { icon: Users, title: "Seats 24 comfortably", body: "Classroom-style setup with ergonomic chairs and generous writing space for every participant." },
  { icon: Tv, title: "Smart TV display", body: "Large 4K screen with HDMI, wireless casting and adjustable inputs for flawless presentations." },
  { icon: Wifi, title: "High-speed Wi-Fi", body: "Fibre-backed connectivity that keeps demos, video calls and live streams running smoothly." },
  { icon: Zap, title: "Uninterrupted power", body: "Grid + inverter + generator. Your session runs from start to finish, no matter what." },
  { icon: Volume2, title: "Quality sound system", body: "Wireless microphones and balanced speakers so every seat hears every word clearly." },
  { icon: Snowflake, title: "Fully air-conditioned", body: "Cool, filtered air throughout the day — your attendees stay focused, not fanned." },
  { icon: Wand2, title: "Clean, modern & inspiring", body: "A calm, well-designed environment that quietly says: this is serious work, done well." },
];

function Why() {
  return (
    <section id="why" className="bg-ivory py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Why Castle Academy
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
              The details that make the difference
              <span className="text-gold">.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Every element of the room is dialled in for one purpose — so trainers
            can teach, and participants can learn, without a single hassle.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border bg-cream p-7 transition-all hover:-translate-y-1 hover:border-gold/50 hover:shadow-xl",
                i === 0 && "lg:col-span-2 lg:row-span-1"
              )}
            >
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-royal/10 text-gold transition-colors group-hover:bg-gold/15 group-hover:text-gold">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/0 blur-2xl transition-colors group-hover:bg-gold/10" />
            </div>
          ))}
          <div className="relative overflow-hidden rounded-2xl bg-royal p-7 text-white">
            <div className="absolute inset-0 grain opacity-40" />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">
                Built for outcomes
              </p>
              <h3 className="mt-3 font-display text-2xl leading-snug">
                A room your team will remember for the right reasons.
              </h3>
              <a
                href="#book"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-soft"
              >
                Reserve the space <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Perfect For ---------------- */

const USE_CASES = [
  { img: useCorporate, label: "Corporate Trainings", body: "Onboarding, compliance and leadership programs — delivered with polish." },
  { img: useWorkshop, label: "Workshops", body: "Hands-on sessions with room to build, sketch and think out loud." },
  { img: useSeminar, label: "Seminars", body: "Speaker-led events with premium AV and attentive hosting." },
  { img: useMeeting, label: "Team Meetings", body: "Focused, distraction-free space for high-stakes conversations." },
  { img: useCourse, label: "Professional Courses", body: "Multi-day cohorts and certifications in a room built to teach." },
  { img: usePresentation, label: "Business Presentations", body: "Pitch, launch and demo on a large 4K screen with cinema-grade sound." },
  { img: useCoaching, label: "Coaching Sessions", body: "Small, private setups for one-on-one and executive coaching." },
  { img: useStrategy, label: "Strategy Sessions", body: "Whiteboards, walls and quiet — where big decisions get made." },
];

function PerfectFor() {
  return (
    <section className="relative overflow-hidden bg-royal-deep py-20 text-white md:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-40 grain" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Perfect for
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight md:text-5xl">
              Whatever you're bringing to the room, we've hosted it{" "}
              <span className="text-gold">beautifully</span>.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            A single room. Eight ways it disappears into the background and
            lets your work take centre stage.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u, i) => (
            <a
              key={u.label}
              href="#book"
              className={cn(
                "group relative isolate flex flex-col justify-end overflow-hidden border border-white/10 transition-all duration-500 hover:border-gold/60",
                i === 0 && "lg:col-span-2 lg:row-span-2"
              )}
            >
              <div className={cn("relative w-full overflow-hidden", i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[560px]" : "aspect-[4/5]")}>
                <img
                  src={u.img}
                  alt={u.label}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                />
                {/* dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-royal-deep via-royal-deep/50 to-royal-deep/10" />
                {/* gold hairline frame on hover */}
                <div className="pointer-events-none absolute inset-2 border border-gold/0 transition-colors duration-500 group-hover:border-gold/40" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="flex items-baseline gap-3 text-[11px] uppercase tracking-[0.2em] text-gold/80">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px flex-1 bg-gold/30" />
                </div>
                <h3 className={cn("mt-2 font-display text-white", i === 0 ? "text-3xl md:text-4xl" : "text-xl md:text-2xl")}>
                  {u.label}
                </h3>
                <p className={cn(
                  "mt-2 text-sm leading-relaxed text-white/70 transition-all duration-500",
                  i === 0 ? "max-w-md opacity-100" : "max-h-0 overflow-hidden opacity-0 group-hover:max-h-32 group-hover:opacity-100"
                )}>
                  {u.body}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

function Pricing() {
  return (
    <section id="pricing" className="bg-ivory py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Simple, honest pricing
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            One clear rate. No surprises at checkout.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Naira pricing. Instant confirmation. Pay securely via Paystack or
            Flutterwave.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-cream shadow-xl shadow-royal/5">
          <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
            <div className="relative overflow-hidden bg-royal p-8 text-white md:p-12">
              <div className="absolute inset-0 grain opacity-30" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-soft">
                  <Star className="h-3 w-3 fill-gold text-gold" /> Standard Booking
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="font-display text-5xl leading-none text-white md:text-6xl">
                    ₦100,000
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  for up to 3 hours of dedicated venue time
                </p>
                <div className="mt-10 h-px w-full bg-white/10" />
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                      Extra hour
                    </div>
                    <div className="mt-1 font-display text-2xl text-gold">
                      ₦30,000
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/50">
                      Full-day packages
                    </div>
                    <div className="mt-1 text-sm text-white/80">
                      Custom rates on request
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h3 className="font-display text-2xl text-ink">Included with every booking</h3>
              <ul className="mt-6 space-y-3.5">
                {[
                  "Classroom setup for up to 24 participants",
                  "Smart TV, HDMI cables & wireless casting",
                  "High-speed fibre Wi-Fi for the whole room",
                  "Uninterrupted power (grid + inverter + generator)",
                  "Wireless microphones and sound system",
                  "Chilled bottled water on arrival",
                  "Dedicated on-site host during your session",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink/85">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full rounded-full bg-royal text-primary-foreground hover:bg-royal-deep"
                size="lg"
              >
                <a href="#book">Reserve your date</a>
              </Button>
              <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure payment via Paystack / Flutterwave
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- How to Book ---------------- */

const STEPS = [
  { n: "01", title: "Pick your date & time", body: "Choose a preferred day and window from our live calendar." },
  { n: "02", title: "Fill in your event details", body: "Tell us who you are, what you're hosting and how many are coming." },
  { n: "03", title: "Get instant confirmation", body: "Receive booking confirmation and secure payment instructions via Paystack or Flutterwave." },
  { n: "04", title: "Walk in & enjoy", body: "Arrive to a room that's set up, powered, and ready — you just teach." },
];

function How() {
  return (
    <section id="how" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            How to book
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            Reserve your space in <span className="text-gold">four calm steps</span>.
          </h2>
        </div>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent md:block"
          />
          <ol className="grid gap-8 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-ivory font-display text-sm font-semibold text-royal-deep shadow-sm">
                  {s.n}
                </div>
                <h3 className="mt-6 font-display text-xl text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}


/* ---------------- Gallery ---------------- */

const GALLERY = [
  { src: g1, caption: "Classroom setup — 24 seats" },
  { src: g2, caption: "Smart TV & presentation wall" },
  { src: g3, caption: "Guest lounge & coffee station" },
  { src: g4, caption: "Strategy sessions in action" },
  { src: g5, caption: "Our home in Lekki, Lagos" },
];

function Gallery() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);


  return (
    <section id="gallery" className="bg-royal py-20 text-white md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Inside Castle Academy
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight md:text-5xl">
              A room that <span className="text-gold">feels</span> as premium as it looks.
            </h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => api?.scrollPrev()}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold hover:text-gold"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold hover:text-gold"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Carousel setApi={setApi} opts={{ loop: true }} className="mt-12">
          <CarouselContent className="-ml-4">
            {GALLERY.map((g, i) => (
              <CarouselItem key={i} className="pl-4 md:basis-4/5 lg:basis-2/3">
                <figure className="overflow-hidden rounded-2xl border border-gold/30 bg-royal-deep">
                  <img
                    src={g.src}
                    alt={g.caption}
                    className="h-[320px] w-full object-cover sm:h-[440px] md:h-[520px]"
                    loading="lazy"
                    width={1280}
                    height={896}
                  />
                  <figcaption className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm text-white/80">
                    <span>{g.caption}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-gold">
                      0{i + 1} / 0{GALLERY.length}
                    </span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden" />
          <CarouselNext className="hidden" />
        </Carousel>

        <div className="mt-8 flex justify-center gap-2">
          {GALLERY.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-8 bg-gold" : "w-4 bg-white/25 hover:bg-white/50"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Booking form ---------------- */

const bookingSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  organisation: z.string().optional(),
  phone: z.string().min(7, "Please enter a valid Nigerian phone number"),
  email: z.string().email("Please enter a valid email address"),
  eventType: z.enum(["training", "workshop", "seminar", "meeting", "coaching", "other"], {
    message: "Please choose an event type",
  }),
  date: z.date({ message: "Please pick a date" }),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  participants: z.coerce
    .number({ message: "Please enter a number" })
    .min(1, "At least 1 participant")
    .max(24, "Our room seats up to 24"),
  requirements: z.string().optional(),
});

type BookingValues = z.infer<typeof bookingSchema>;

function Booking() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { participants: 12 },
  });

  const date = watch("date");
  const eventType = watch("eventType");

  const onSubmit = async (values: BookingValues) => {
    await new Promise((r) => setTimeout(r, 700));
    console.log("Booking submitted", values);
    toast.success("Space reserved!", {
      description:
        "We'll send confirmation + payment instructions to your email and WhatsApp shortly.",
    });
    reset({ participants: 12 });
  };

  return (
    <section id="book" className="bg-ivory py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-cream shadow-xl shadow-royal/5">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-royal-deep p-8 text-white md:p-12">
              <div className="absolute inset-0 grain opacity-30" />
              <div className="relative flex h-full flex-col">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
                  Reserve the room
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight text-white md:text-4xl">
                  Book your training space in a few short fields.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                  Submit the form and we'll confirm availability, hold your slot,
                  and send secure payment instructions straight to your inbox — plus
                  a friendly WhatsApp note so nothing falls through the cracks.
                </p>

                <ul className="mt-8 space-y-4 text-sm">
                  {[
                    { icon: Clock, label: "Instant response during business hours" },
                    { icon: ShieldCheck, label: "Secure Paystack / Flutterwave payments" },
                    { icon: MessageCircle, label: "Auto WhatsApp booking confirmation" },
                  ].map((it) => (
                    <li key={it.label} className="flex items-start gap-3 text-white/85">
                      <it.icon className="mt-0.5 h-4 w-4 text-gold" />
                      {it.label}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-10 text-xs text-white/60">
                  Submissions are logged securely and trigger an email + WhatsApp
                  confirmation to your team.
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 md:p-12">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" error={errors.fullName?.message}>
                  <Input placeholder="Adaeze Okafor" {...register("fullName")} />
                </Field>
                <Field label="Organisation" hint="optional">
                  <Input placeholder="Company or team" {...register("organisation")} />
                </Field>
                <Field label="Phone number" error={errors.phone?.message}>
                  <Input placeholder="+234 803 000 0000" {...register("phone")} />
                </Field>
                <Field label="Email address" error={errors.email?.message}>
                  <Input type="email" placeholder="you@company.com" {...register("email")} />
                </Field>

                <Field label="Event type" error={errors.eventType?.message}>
                  <Select
                    value={eventType}
                    onValueChange={(v) => setValue("eventType", v as BookingValues["eventType"], { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Corporate training</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="meeting">Team meeting</SelectItem>
                      <SelectItem value="coaching">Coaching session</SelectItem>
                      <SelectItem value="other">Something else</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Preferred date" error={errors.date?.message}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start bg-background text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setValue("date", d, { shouldValidate: true })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={{ before: new Date() }}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field label="Start time" error={errors.startTime?.message}>
                  <Input type="time" {...register("startTime")} />
                </Field>
                <Field label="End time" error={errors.endTime?.message}>
                  <Input type="time" {...register("endTime")} />
                </Field>

                <Field
                  label="Expected participants"
                  error={errors.participants?.message}
                  hint="max 24"
                >
                  <Input type="number" min={1} max={24} {...register("participants")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Additional requirements" hint="optional">
                    <Textarea
                      rows={4}
                      placeholder="Anything else we should prepare — catering, extra whiteboards, projector setup, accessibility needs…"
                      {...register("requirements")}
                    />
                  </Field>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="mt-8 w-full rounded-full bg-gold text-royal-deep hover:bg-gold-soft"
              >
                {isSubmitting ? "Reserving…" : "Reserve My Space"}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                By submitting, you agree to be contacted about your booking.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label className="text-xs font-medium uppercase tracking-[0.12em] text-ink/70">
          {label}
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------- Testimonials ---------------- */

const QUOTES = [
  {
    quote:
      "We ran a two-day leadership programme and every detail was already handled. Power stayed on, Wi-Fi was solid, and the room genuinely impressed our facilitators.",
    name: "Chinaza Eze",
    role: "L&D Manager, Lagos-based fintech",
  },
  {
    quote:
      "Booking took less than five minutes and confirmation came through on WhatsApp. As an independent trainer, that peace of mind is priceless.",
    name: "Bode Adeyemi",
    role: "Executive Coach",
  },
  {
    quote:
      "Clean, quiet, well-designed. My clients kept commenting on how professional the space felt. We'll definitely be back.",
    name: "Amaka Nwosu",
    role: "HR Consultant",
  },
];

function Testimonials() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  return (
    <section className="bg-royal-deep py-20 text-white md:py-28">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          What clients say
        </p>
        <div className="mt-8 min-h-[220px]">
          <div className="mb-6 flex justify-center gap-1">
            {[...Array(5)].map((_, k) => (
              <Star key={k} className="h-4 w-4 fill-gold text-gold" />
            ))}
          </div>
          <blockquote className="font-display text-2xl leading-snug text-white md:text-3xl">
            &ldquo;{q.quote}&rdquo;
          </blockquote>
          <div className="mt-6 text-sm text-white/70">
            <span className="font-medium text-white">{q.name}</span> · {q.role}
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          {QUOTES.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                k === i ? "w-8 bg-gold" : "w-4 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Testimonial ${k + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Location & Contact ---------------- */

function Location() {
  return (
    <section className="bg-ivory py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Find us
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            Right in the heart of <span className="text-gold">Lekki, Lagos</span>.
          </h2>
          <div className="mt-6 space-y-4 text-sm text-ink/85">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-gold" />
              <span>
                Castle Academy Training Venue
                <br />
                Lekki Phase 1, Lagos, Nigeria
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-gold" />
              <span>+234 XXX XXX XXXX (WhatsApp enabled)</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-gold" />
              <span>bookings@castleacademy.ng</span>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border shadow-xl shadow-royal/5">
          <iframe
            title="Castle Academy location — Lekki, Lagos"
            src="https://www.google.com/maps?q=Lekki+Phase+1,+Lagos,+Nigeria&output=embed"
            className="h-80 w-full md:h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function Assistance() {
  return (
    <section className="bg-cream py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          Need assistance?
        </p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-4xl">
          Real people, ready to help you plan a great session.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Not sure about timing, catering, or setup? Chat with us — we'll walk
          you through it and make sure your event goes off without a hitch.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-royal text-primary-foreground hover:bg-royal-deep"
          >
            <a href="https://wa.me/2340000000000" target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-gold/30 bg-transparent text-gold hover:bg-royal/5"
          >
            <a href="mailto:bookings@castleacademy.ng">
              <Mail className="mr-2 h-4 w-4" /> Email bookings
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-royal py-20 text-white md:py-28">
      <div className="pointer-events-none absolute inset-0 grain opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-royal-deep blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
        <h2 className="font-display text-4xl leading-tight md:text-6xl">
          Create great learning experiences.
        </h2>
        <p className="mt-4 text-sm uppercase tracking-[0.22em] text-gold">
          Professional · Comfortable · Reliable
        </p>
        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-gold px-8 text-royal-deep hover:bg-gold-soft"
          >
            <a href="#book">
              Book Your Training Space Today <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="bg-royal-deep pt-14 pb-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Logo tone="onDark" className="h-14" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            A modern, fully equipped training venue in Lekki, Lagos — built for
            HR teams, trainers and organisations that expect the best.
          </p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Explore
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-gold">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Contact
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>+234 XXX XXX XXXX</li>
            <li>bookings@castleacademy.ng</li>
            <li>Lekki Phase 1, Lagos</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 px-5 pt-6 text-xs text-white/50 md:flex-row md:px-8">
        <div>© {new Date().getFullYear()} The Castle Academy. All rights reserved.</div>
        <div>Made with care in Lagos, Nigeria.</div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */

function Landing() {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <Nav />
      <main>
        <Hero />
        <Why />
        <PerfectFor />
        <Pricing />
        <How />
        <Availability />
        <Gallery />
        <Booking />
        <Testimonials />
        <Location />
        <Assistance />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
