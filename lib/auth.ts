import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { sql } from "./db";

const SECRET = process.env.ADMIN_SECRET;
const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

if (!SECRET) {
  // Only warn at module load — don't throw so build doesn't fail
  console.warn("[auth] ADMIN_SECRET is not set. Admin routes will be inaccessible.");
}

/** Create a simple HMAC-signed token: payload.signature */
export function signToken(payload: string): string {
  const sig = createHmac("sha256", SECRET ?? "insecure")
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

/** Verify a signed token. Returns the payload string or null if invalid. */
export function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = createHmac("sha256", SECRET ?? "insecure")
    .update(payload)
    .digest("hex");
  try {
    const match = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    return match ? payload : null;
  } catch {
    return null;
  }
}

/** Set the admin session cookie (call from API route after successful login). */
export function setSessionCookie(response: Response): void {
  const payload = `admin:${Date.now()}`;
  const token = signToken(payload);
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`
  );
}

/** Clear the admin session cookie (logout). */
export function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

/**
 * Check if the current request has a valid admin session.
 * Use in Server Components / layouts via next/headers cookies().
 */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token) !== null;
}

export interface AdminSession {
  id: string;
  username: string;
  role: "owner" | "admin";
}

/**
 * Resolve the current admin from the session cookie AND look up their
 * live role from the database. Returns null if not authenticated.
 * Token payload format from login: `admin:<uuid>:<timestamp>`.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const parts = payload.split(":");
  const id = parts[1]; // uuid has no colons
  if (!id) return null;

  try {
    const rows = await sql`
      SELECT id, username, role FROM admins WHERE id = ${id}::uuid LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as { id: string; username: string; role: string };
    return { id: r.id, username: r.username, role: (r.role === "owner" ? "owner" : "admin") };
  } catch {
    return null;
  }
}

/** True if the current session belongs to an owner-level admin. */
export async function isOwner(): Promise<boolean> {
  const s = await getAdminSession();
  return s?.role === "owner";
}
