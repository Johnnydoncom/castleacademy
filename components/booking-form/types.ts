import type { QuoteLine } from "@/lib/pricing";

export interface BusySlot {
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface VenueWindow {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WeeklyHours extends VenueWindow {
  dayOfWeek: number; // 0 = Sunday
}

export interface DayAvailability {
  date: string; // "YYYY-MM-DD"
  venueHours: VenueWindow;
  busySlots: BusySlot[];
}

/** The client-side view of a priced quote — mirrors the /api/quote response. */
export interface Quote {
  quoteId: string;
  source: "ai" | "deterministic";
  hours: number;
  days: number;
  lines: QuoteLine[];
  baseSubtotal: number;
  discountAmount: number;
  discountApplied: string;
  subtotal: number;
  breakdown: string;
  vatRate: number;
  vatAmount: number;
  total: number;
  extrasPriced: boolean;
  /** Any booked day falls on a Friday — show the community-rate note. */
  hasFriday?: boolean;
  fridayCommunityNote?: string;
}

export type QuoteState =
  | { status: "idle" }
  /** Keeps the previous figures on screen while refetching, to avoid flicker. */
  | { status: "loading"; previous: Quote | null }
  | { status: "ready"; quote: Quote }
  | { status: "unavailable" };

export interface BookedDay {
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingResult {
  reference: string;
  checkoutLink: string | null;
  amount: number | null;
  email: string;
  /** When the 6-hour soft-lock lapses, as epoch ms. */
  heldUntil: number;
  summary: {
    days: BookedDay[];
    participants: number;
    eventTypeLabel: string;
    extras: string[];
  };
}

/**
 * One state, not three booleans. The success view replaces the form entirely,
 * so nothing can race between "reset the form" and "read the result" — which is
 * what the old implementation's three useRef mirrors existed to work around.
 */
export type View =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; result: BookingResult };
