import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

/**
 * GET /api/admin/me
 * Returns the current admin's identity and role, so the UI can
 * gate owner-only features (Venue Settings, Admin Accounts, revenue).
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: session.id,
    username: session.username,
    role: session.role,
    isOwner: session.role === "owner",
  });
}
