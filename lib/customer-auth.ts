import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { sql } from "./db";

/**
 * Customer session auth — mirrors the admin HMAC-cookie pattern but with a
 * separate cookie and secret namespace so admin and customer sessions never mix.
 */

const SECRET = process.env.ADMIN_SECRET || "insecure-dev-secret";
const COOKIE_NAME = "customer_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function sign(payload: string): string {
  const sig = createHmac("sha256", SECRET).update(`customer:${payload}`).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = createHmac("sha256", SECRET).update(`customer:${payload}`).digest("hex");
  try {
    const ok = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    return ok ? payload : null;
  } catch {
    return null;
  }
}

/** Build the Set-Cookie header value for a logged-in customer. */
export function buildCustomerCookie(customerId: string): string {
  const token = sign(`${customerId}:${Date.now()}`);
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function buildClearCustomerCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export interface CustomerSession {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

/** Resolve the current customer from the session cookie, or null. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  const id = payload.split(":")[0];
  if (!id) return null;
  try {
    const rows = await sql`
      SELECT id, full_name, email, phone FROM customers WHERE id = ${id}::uuid LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as CustomerSession;
    return { id: r.id, full_name: r.full_name, email: r.email, phone: r.phone };
  } catch {
    return null;
  }
}
