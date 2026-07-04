import { ArrowRight, Snowflake, Tv, Users, Volume2, Wand2, Wifi, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Users, title: "Seats 24 comfortably", body: "Classroom-style setup with ergonomic chairs and generous writing space for every participant." },
  { icon: Tv, title: "Smart TV display", body: "Large 4K screen with HDMI, wireless casting and adjustable inputs for flawless presentations." },
  { icon: Wifi, title: "High-speed Wi-Fi", body: "Fibre-backed connectivity that keeps demos, video calls and live streams running smoothly." },
  { icon: Zap, title: "Uninterrupted power", body: "Grid + inverter + generator. Your session runs from start to finish, no matter what." },
  { icon: Volume2, title: "Quality sound system", body: "Wireless microphones and balanced speakers so every seat hears every word clearly." },
  { icon: Snowflake, title: "Fully air-conditioned", body: "Cool, filtered air throughout the day — your attendees stay focused, not fanned." },
  { icon: Wand2, title: "Clean, modern & inspiring", body: "A calm, well-designed environment that quietly says: this is serious work, done well." },
];

export function Why() {
  return (
    <section id="why" className="bg-ivory py-20 md:py-28" aria-labelledby="why-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Why Castle Academy
            </p>
            <h2 id="why-heading" className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
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
                <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
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
                Reserve the space <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
