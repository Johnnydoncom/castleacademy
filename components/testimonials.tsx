"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Testimonials() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];

  return (
    <section className="bg-royal-deep py-20 text-white md:py-28" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <p id="testimonials-heading" className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          What clients say
        </p>
        <div className="mt-8 min-h-[220px]">
          <div className="mb-6 flex justify-center gap-1" aria-label="5 out of 5 stars">
            {[...Array(5)].map((_, k) => (
              <Star key={k} className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />
            ))}
          </div>
          <blockquote className="font-display text-2xl leading-snug text-white md:text-3xl">
            &ldquo;{q.quote}&rdquo;
          </blockquote>
          <div className="mt-6 text-sm text-white/70">
            <span className="font-medium text-white">{q.name}</span> · {q.role}
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Testimonials">
          {QUOTES.map((quote, k) => (
            <button
              key={k}
              role="tab"
              onClick={() => setI(k)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                k === i ? "w-8 bg-gold" : "w-4 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Testimonial from ${quote.name}`}
              aria-selected={k === i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
