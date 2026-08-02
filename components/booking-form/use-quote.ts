"use client";

import * as React from "react";
import type { Quote, QuoteState } from "./types";

/**
 * Live pricing while the customer is still choosing.
 *
 * Never blocks navigation: the customer can reach the last step and submit while
 * a quote is still in flight, because `/api/book` prices through the same cache
 * key and arrives at the same number regardless.
 */

export interface QuoteInput {
  /** One entry per booked day. Empty until the customer has picked dates. */
  days: { date: string; startTime: string; endTime: string }[];
  participants?: number;
}

const DEBOUNCE_MS = 500;

function isComplete(input: QuoteInput): boolean {
  return Boolean(
    input.days.length > 0 &&
      input.days.every((d) => d.date && d.startTime && d.endTime) &&
      Number.isFinite(input.participants)
  );
}

export function useQuote(input: QuoteInput): {
  state: QuoteState;
  quote: Quote | null;
  quoteId: string | null;
} {
  const [state, setState] = React.useState<QuoteState>({ status: "idle" });

  // Memo so stepping back and forth through the form is instant and free.
  const cache = React.useRef(new Map<string, Quote>());
  // Monotonic id, so a slow response for stale input can't overwrite a fresh one.
  const latest = React.useRef(0);

  const key = isComplete(input)
    ? JSON.stringify({
        days: [...input.days].sort((a, b) => a.date.localeCompare(b.date)),
        participants: input.participants,
      })
    : null;

  React.useEffect(() => {
    if (!key) {
      setState({ status: "idle" });
      return;
    }

    const hit = cache.current.get(key);
    if (hit) {
      setState({ status: "ready", quote: hit });
      return;
    }

    const requestId = ++latest.current;
    const controller = new AbortController();

    setState((prev) => ({
      status: "loading",
      previous: prev.status === "ready" ? prev.quote : null,
    }));

    // The key IS the payload — send it verbatim rather than closing over
    // `input`, which is a fresh object on every render.
    const timer = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: key,
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          if (requestId !== latest.current) return; // a newer request won
          if (data?.ok) {
            const quote = data as Quote;
            cache.current.set(key, quote);
            setState({ status: "ready", quote });
          } else if (data?.reason === "incomplete") {
            setState({ status: "idle" });
          } else {
            setState({ status: "unavailable" });
          }
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (requestId !== latest.current) return;
          setState({ status: "unavailable" });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const quote = state.status === "ready" ? state.quote : null;

  return { state, quote, quoteId: quote?.quoteId ?? null };
}
