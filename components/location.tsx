import { Mail, MapPin, Phone } from "lucide-react";

export function Location() {
  return (
    <section className="bg-ivory py-20 md:py-28" aria-labelledby="location-heading">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Find us
          </p>
          <h2 id="location-heading" className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            Right in the heart of <span className="text-gold">Lekki, Lagos</span>.
          </h2>
          <address className="mt-6 space-y-4 text-sm text-ink/85 not-italic">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-gold flex-shrink-0" aria-hidden="true" />
              <span>
                Castle Academy Training Venue
                <br />
                Lekki Phase 1, Lagos, Nigeria
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-gold flex-shrink-0" aria-hidden="true" />
              <a href="tel:+2340000000000" className="hover:text-gold transition-colors">
                +234 XXX XXX XXXX (WhatsApp enabled)
              </a>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-gold flex-shrink-0" aria-hidden="true" />
              <a href="mailto:bookings@castleacademy.ng" className="hover:text-gold transition-colors">
                bookings@castleacademy.ng
              </a>
            </div>
          </address>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border shadow-xl shadow-royal/5">
          <iframe
            title="Castle Academy location — Lekki Phase 1, Lagos"
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
