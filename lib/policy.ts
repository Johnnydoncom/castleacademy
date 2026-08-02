/**
 * Single source of truth for the cancellation / refund policy.
 *
 * This used to be written out by hand in seven different places (the booking form,
 * the admin email, the customer email, the Nomba webhook receipt, the payment
 * callback page, the mailer and the invoice PDF) and they had drifted apart —
 * the form claimed bookings could never be cancelled while the pricing structure
 * and the on-page FAQ described a tiered policy. The tiered policy is correct.
 *
 * Keep this file in step with the CANCELLATION/REFUND POLICY section of
 * the published pricing structure.
 */

export interface CancellationTier {
  /** Short window label, e.g. "More than 7 days before" */
  window: string;
  /** What happens in that window */
  outcome: string;
}

export const CANCELLATION_TIERS: readonly CancellationTier[] = [
  {
    window: "More than 7 days before your event",
    outcome:
      "Free rescheduling. A 5% service charge plus VAT is retained.",
  },
  {
    window: "3–7 days before",
    outcome:
      "50% of the payment is retained, or applied in full to a new date.",
  },
  {
    window: "Less than 72 hours before",
    outcome: "The booking becomes non-refundable.",
  },
] as const;

/** One-line summary for tight spaces (buttons, footnotes, meta descriptions). */
export const CANCELLATION_SUMMARY_TEXT =
  "Free rescheduling more than 7 days ahead (5% service charge + VAT retained), 50% retained 3–7 days out, and non-refundable within 72 hours.";

/** Tighter still, for single-line contexts like the PDF footer. */
export const CANCELLATION_COMPACT =
  "Cancellation: free reschedule 7+ days ahead; 50% retained 3-7 days; non-refundable within 72 hours.";

/** The sentence the customer explicitly agrees to before paying. */
export const CANCELLATION_CONSENT_TEXT =
  "I understand the cancellation policy and that charges apply if I cancel or reschedule close to the date.";

/** Plain-text rendering, for email text parts and PDF bodies. */
export const CANCELLATION_PLAIN = CANCELLATION_TIERS.map(
  (t) => `${t.window}: ${t.outcome}`
).join("\n");

/**
 * HTML rendering for transactional emails. Inline styles only — email clients
 * strip <style> blocks, and every other template in this repo inlines too.
 */
export const CANCELLATION_HTML = `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Cancellation &amp; rescheduling policy</p>
  <ul style="margin:0;padding-left:18px;color:#92400e;font-size:12px;line-height:1.7;">
    ${CANCELLATION_TIERS.map(
      (t) => `<li><strong>${t.window}:</strong> ${t.outcome}</li>`
    ).join("\n    ")}
  </ul>
</div>`;
