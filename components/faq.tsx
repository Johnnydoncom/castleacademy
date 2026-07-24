"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarClock,
  Sparkles,
  Clock,
  RefreshCw,
  CreditCard,
  Car,
  Paintbrush,
  ShieldAlert,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS, FaqItemData } from "@/lib/faq-data";

const ICON_MAP: Record<string, React.ElementType> = {
  CalendarClock,
  Sparkles,
  Clock,
  RefreshCw,
  CreditCard,
  Car,
  Paintbrush,
  ShieldAlert,
};

const CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "booking", label: "Bookings & Payments" },
  { id: "facility", label: "Facility & Hours" },
  { id: "rules", label: "Rules & Customization" },
] as const;

export function Faq() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredFaqs =
    activeTab === "all"
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === activeTab);

  return (
    <section
      id="faq"
      className="bg-cream py-20 md:py-28"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Frequently Asked Questions
          </div>
          <h2
            id="faq-heading"
            className="mt-4 font-display text-3xl leading-tight text-ink md:text-5xl"
          >
            Everything you need to <span className="text-gold">know</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Clear, straightforward answers about booking, policies, facilities,
            and guidelines at Castle Academy.
          </p>
        </div>

        {/* Category Tabs */}
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label="FAQ categories"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "rounded-full px-5 py-2 text-xs font-medium tracking-wide transition-all cursor-pointer",
                  isActive
                    ? "bg-royal text-white shadow-md shadow-royal/20"
                    : "bg-ivory text-ink/70 hover:bg-gold/15 hover:text-ink border border-border"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion Grid */}
        <div className="mt-10">
          <Accordion
            type="single"
            collapsible
            defaultValue="advance-booking"
            className="space-y-4"
          >
            {filteredFaqs.map((faq: FaqItemData) => {
              const Icon = ICON_MAP[faq.iconName] || HelpCircle;
              return (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="group rounded-2xl border border-border/80 bg-ivory px-6 py-1 transition-all duration-200 data-[state=open]:border-gold/60 data-[state=open]:bg-cream data-[state=open]:shadow-md hover:border-gold/40"
                >
                  <AccordionTrigger className="flex flex-1 items-center justify-between text-left py-4 text-base font-display font-medium text-ink hover:no-underline cursor-pointer group-data-[state=open]:text-gold">
                    <div className="flex items-center gap-3.5 pr-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal/5 text-gold group-data-[state=open]:bg-gold group-data-[state=open]:text-royal-deep transition-colors">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <span className="leading-snug">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-13 pr-4 pb-5 pt-1 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Bottom Help Nudge */}
        <div className="mt-14 rounded-2xl border border-gold/20 bg-royal p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="font-display text-xl text-white">Have a specific question?</h3>
            <p className="mt-1 text-xs md:text-sm text-white/70">
              Can&apos;t find what you&apos;re looking for? Reach out directly to our team anytime.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-gold text-royal-deep font-medium hover:bg-gold-soft transition-colors shrink-0"
          >
            <a
              href="https://wa.me/2349042222296"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Ask on WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
