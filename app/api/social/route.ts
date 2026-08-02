import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialLinks } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";

const SUPPORTED_PLATFORMS = [
  "facebook", "instagram", "twitter", "tiktok", "youtube", "linkedin",
] as const;

/**
 * GET /api/social
 * Returns all platforms with a non-empty URL (public).
 */
export async function GET() {
  try {
    const rows = await db
      .select({ platform: socialLinks.platform, url: socialLinks.url })
      .from(socialLinks)
      .orderBy(asc(socialLinks.platform));
    const links: Record<string, string> = {};
    for (const row of rows) {
      links[row.platform as string] = row.url as string;
    }
    return NextResponse.json({ links });
  } catch (err) {
    console.error("[API/social] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch social links" }, { status: 500 });
  }
}

/**
 * PUT /api/social
 * Updates social links. Requires x-admin-secret header.
 * Body: { platform: string, url: string }
 */
export async function PUT(req: Request) {
  // Social links are an owner-only venue setting.
  let isAuthorized = false;
  const secret = req.headers.get("x-admin-secret");

  if (secret && secret === process.env.ADMIN_SECRET) {
    isAuthorized = true;
  } else {
    const session = await getAdminSession();
    if (session?.role === "owner") {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Forbidden — owner access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { platform, url } = body;

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform. Must be one of: ${SUPPORTED_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }

    const sanitizedUrl = typeof url === "string" ? url.trim() : "";

    // MySQL upsert: ON DUPLICATE KEY UPDATE (replaces PostgreSQL ON CONFLICT)
    await db
      .insert(socialLinks)
      .values({ platform, url: sanitizedUrl, updatedAt: sql`NOW()` })
      .onDuplicateKeyUpdate({
        set: { url: sanitizedUrl, updatedAt: sql`NOW()` },
      });

    return NextResponse.json({ success: true, platform, url: sanitizedUrl });
  } catch (err) {
    console.error("[API/social] PUT error:", err);
    return NextResponse.json({ error: "Failed to update social link" }, { status: 500 });
  }
}
