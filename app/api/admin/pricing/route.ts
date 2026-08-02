import { NextResponse } from "next/server";
import { isOwner, getAdminSession } from "@/lib/auth";
import { loadPricingConfig, savePricingConfig } from "@/lib/pricing-config-store";

/**
 * GET/PUT the pricing structure.
 *
 * Owner-only: these values decide what every customer is charged, so they sit
 * behind the same gate as venue settings and admin accounts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { config } = await loadPricingConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const session = await getAdminSession();
    // savePricingConfig normalises every field, so a bad value falls back to the
    // current default rather than taking pricing down.
    const config = await savePricingConfig(
      (body as { config?: unknown })?.config ?? body,
      session?.username ?? "owner"
    );
    return NextResponse.json({ success: true, config });
  } catch (err) {
    console.error("[API/admin/pricing] save failed:", err);
    return NextResponse.json({ error: "Failed to save pricing" }, { status: 500 });
  }
}

