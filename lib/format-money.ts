/**
 * Naira formatting shared by the marketing pages, so a rate rendered in the
 * pricing section and the same rate in the booking banner can never drift.
 */
export function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
