import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const SUPPORTED_PLATFORMS = [
  "facebook", "instagram", "twitter", "tiktok", "youtube", "linkedin",
] as const;

/**
 * GET /api/social
 * Returns all platforms with a non-empty URL (public).
 */
export async function GET() {
  try {
    const rows = await sql`
      SELECT platform, url FROM social_links ORDER BY platform
    `;
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
  let isAuthorized = false;
  const secret = req.headers.get("x-admin-secret");
  
  if (secret && secret === process.env.ADMIN_SECRET) {
    isAuthorized = true;
  } else {
    const store = await cookies();
    const token = store.get("admin_session")?.value;
    if (token && verifyToken(token)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    await sql`
      INSERT INTO social_links (platform, url, updated_at)
      VALUES (${platform}, ${sanitizedUrl}, NOW())
      ON CONFLICT (platform)
      DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()
    `;

    return NextResponse.json({ success: true, platform, url: sanitizedUrl });
  } catch (err) {
    console.error("[API/social] PUT error:", err);
    return NextResponse.json({ error: "Failed to update social link" }, { status: 500 });
  }
}
