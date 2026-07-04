import Image from "next/image";
import { cn } from "@/lib/utils";

const USE_CASES = [
  { img: "/images/use-corporate.jpg", label: "Corporate Trainings", body: "Onboarding, compliance and leadership programs — delivered with polish." },
  { img: "/images/use-workshop.jpg", label: "Workshops", body: "Hands-on sessions with room to build, sketch and think out loud." },
  { img: "/images/use-seminar.jpg", label: "Seminars", body: "Speaker-led events with premium AV and attentive hosting." },
  { img: "/images/use-meeting.jpg", label: "Team Meetings", body: "Focused, distraction-free space for high-stakes conversations." },
  { img: "/images/use-course.jpg", label: "Professional Courses", body: "Multi-day cohorts and certifications in a room built to teach." },
  { img: "/images/use-presentation.jpg", label: "Business Presentations", body: "Pitch, launch and demo on a large 4K screen with cinema-grade sound." },
  { img: "/images/use-coaching.jpg", label: "Coaching Sessions", body: "Small, private setups for one-on-one and executive coaching." },
  { img: "/images/use-strategy.jpg", label: "Strategy Sessions", body: "Whiteboards, walls and quiet — where big decisions get made." },
];

export function PerfectFor() {
  return (
    <section className="relative overflow-hidden bg-royal-deep py-20 text-white md:py-28" aria-labelledby="perfectfor-heading">
      <div className="pointer-events-none absolute inset-0 opacity-40 grain" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Perfect for
            </p>
            <h2 id="perfectfor-heading" className="mt-3 font-display text-3xl leading-tight md:text-5xl">
              Whatever you&apos;re bringing to the room, we&apos;ve hosted it{" "}
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
                <Image
                  src={u.img}
                  alt={u.label}
                  fill
                  sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
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
