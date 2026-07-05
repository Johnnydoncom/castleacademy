import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export function Assistance() {
  return (
    <section className="bg-cream py-16 md:py-20" aria-labelledby="assistance-heading">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          Need assistance?
        </p>
        <h2 id="assistance-heading" className="mt-3 font-display text-3xl leading-tight text-ink md:text-4xl">
          Real people, ready to help you plan a great session.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Not sure about timing, catering, or setup? Chat with us — we&apos;ll walk
          you through it and make sure your event goes off without a hitch.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-royal text-primary-foreground hover:bg-royal-deep"
          >
            <a href="https://wa.me/2349042222296" target="_blank" rel="noreferrer noopener" aria-label="Chat with us on WhatsApp">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Chat on WhatsApp
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-gold/30 bg-transparent text-gold hover:bg-royal/5"
          >
            <a href="mailto:bookings@castleacademy.ng" aria-label="Email Castle Academy bookings">
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> Email bookings
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
