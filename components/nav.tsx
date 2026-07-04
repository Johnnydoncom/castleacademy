"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#why", label: "Why Castle" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how", label: "How it works" },
  { href: "#gallery", label: "Gallery" },
  { href: "#book", label: "Book" },
];

export function Nav() {
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
        <a href="#top" className="flex items-center gap-3 group" aria-label="Castle Academy home">
          <Logo tone="onDark" className="h-10 md:h-12" />
        </a>
        <nav className="hidden items-center gap-10 md:flex" aria-label="Main navigation">
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
            aria-expanded={open}
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
