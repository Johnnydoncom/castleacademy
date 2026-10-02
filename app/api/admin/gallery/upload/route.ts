import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminSession } from "@/lib/auth";
import { blobTokenOptions, storageMode } from "@/lib/gallery-storage";

/**
 * POST /api/admin/gallery/upload — issues Vercel Blob client-upload tokens.
 *
 * The browser calls this (via `upload()` from `@vercel/blob/client`), gets a
 * short-lived token scoped to one file under `gallery/`, and sends the file
 * straight to Blob. The gallery row is created afterwards by
 * `POST /api/admin/gallery` with the resulting URL, which re-verifies the file;
 * we don't rely on Blob's completion webhook, which can't reach localhost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (storageMode() !== "blob") {
    return NextResponse.json({ error: "Vercel Blob is not configured." }, { status: 400 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Checked here rather than at the top of the route: this is the only
        // step that hands out write access.
        if (!(await getAdminSession())) throw new Error("Unauthorized");
        return blobTokenOptions(pathname, clientPayload);
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}
