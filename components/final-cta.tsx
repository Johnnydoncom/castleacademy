import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-royal py-20 text-white md:py-28" aria-labelledby="cta-heading">
      <div className="pointer-events-none absolute inset-0 grain opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-royal-deep blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
        <h2 id="cta-heading" className="font-display text-4xl leading-tight md:text-6xl">
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
              Book Your Training Space Today <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
