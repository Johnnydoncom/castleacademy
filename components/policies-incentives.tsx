import React from "react";
import {
  RefreshCw,
  Tag,
  Gift,
  Award,
  Sparkles,
  CalendarCheck,
  Percent,
  CheckCircle2,
} from "lucide-react";
import { CANCELLATION_TIERS } from "@/lib/policy";

export function PoliciesAndIncentives() {
  return (
    <section id="policies" className="bg-cream py-16 md:py-24" aria-labelledby="policies-heading">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        
        {/* Section Title */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Offers, Rewards &amp; Terms
          </div>
          <h2
            id="policies-heading"
            className="mt-4 font-display text-3xl leading-tight text-ink md:text-5xl"
          >
            Policies, Rewards &amp; <span className="text-gold">Incentives</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Clear cancellation terms, early booking savings, referral credits, and multi-day discounts for every client.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Early Booking Incentive */}
          <div className="rounded-3xl border border-emerald-200/80 bg-white p-7 shadow-lg shadow-emerald-950/5 flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <Tag className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Percent className="w-3.5 h-3.5" /> 5% Off
              </div>
              <h3 className="font-display text-xl text-ink font-bold">Early Booking Incentive</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Get <strong>5% off</strong> your total venue fee when your booking is confirmed and paid at least <strong>14 days in advance</strong>.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center gap-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Applied automatically at checkout
            </div>
          </div>

          {/* Card 2: Referral Rewards */}
          <div className="rounded-3xl border border-amber-200/80 bg-white p-7 shadow-lg shadow-amber-950/5 flex flex-col justify-between hover:border-amber-400 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-5">
                <Gift className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
                <Award className="w-3.5 h-3.5" /> Client Rewards
              </div>
              <h3 className="font-display text-xl text-ink font-bold">Referral Rewards</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Refer an organization or colleague to Castle Academy. When they book, you receive a <strong>₦10,000 credit</strong> toward your next booking OR <strong>1 Free Extra Hour</strong>.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-amber-100 flex items-center gap-2 text-xs font-medium text-amber-800">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" /> Claim via WhatsApp or Account
            </div>
          </div>

          {/* Card 3: Loyalty & Multi-Day Discounts */}
          <div className="rounded-3xl border border-blue-200/80 bg-white p-7 shadow-lg shadow-blue-950/5 flex flex-col justify-between hover:border-blue-400 transition-colors md:col-span-2 lg:col-span-1">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Multi-Day &amp; Loyalty
              </div>
              <h3 className="font-display text-xl text-ink font-bold">Loyalty &amp; Multi-Day</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-800 shrink-0">•</span>
                  <span><strong>Multi-Day:</strong> 5% off 2 consecutive days · 10% off 3–5 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-800 shrink-0">•</span>
                  <span><strong>Loyalty:</strong> 10% off your 6th booking (after 5 bookings)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-800 shrink-0">•</span>
                  <span><strong>10+ Bookings:</strong> 1 Complimentary 3-Hour Session</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-blue-100 flex items-center gap-2 text-xs font-medium text-blue-800">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" /> Custom corporate plans available
            </div>
          </div>

        </div>

        {/* Cancellation & Refund Policy Section */}
        <div className="mt-12 rounded-3xl bg-royal p-8 text-white md:p-12 shadow-2xl relative overflow-hidden">
          <div className="grain absolute inset-0 opacity-30" />
          <div className="relative">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/15 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-widest mb-2">
                  <RefreshCw className="w-4 h-4" /> Transparent Terms
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-white">
                  Cancellation &amp; Refund Policy
                </h3>
              </div>
              <p className="text-xs text-white/70 max-w-sm">
                Fair, clear rules so you can book with complete confidence.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {CANCELLATION_TIERS.map((tier, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm space-y-2 hover:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-gold">
                    {tier.window}
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">
                    {tier.outcome}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
              <p>
                Need to request a date change? Contact us on WhatsApp or manage your reservation in your customer dashboard.
              </p>
              <a
                href="https://wa.me/2349042222296"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gold text-royal-deep px-5 py-2.5 rounded-full font-semibold hover:bg-gold-soft transition-colors shrink-0 text-xs"
              >
                Contact Support
              </a>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
