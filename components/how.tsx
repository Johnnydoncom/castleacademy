const STEPS = [
  { n: "01", title: "Pick your date & time", body: "Choose a preferred day and window from our live calendar." },
  { n: "02", title: "Fill in your event details", body: "Tell us who you are, what you're hosting and how many are coming." },
  { n: "03", title: "Get instant confirmation", body: "Receive booking confirmation and secure payment instructions via Paystack or Flutterwave." },
  { n: "04", title: "Walk in & enjoy", body: "Arrive to a room that's set up, powered, and ready — you just teach." },
];

export function How() {
  return (
    <section id="how" className="bg-cream py-20 md:py-28" aria-labelledby="how-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            How to book
          </p>
          <h2 id="how-heading" className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
            Reserve your space in <span className="text-gold">four calm steps</span>.
          </h2>
        </div>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
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
