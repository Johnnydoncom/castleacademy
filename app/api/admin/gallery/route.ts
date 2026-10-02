import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db";
import { createGalleryItem, listGalleryItems } from "@/lib/gallery-store";
import {
  deleteStoredFile,
  saveUpload,
  storageMode,
  verifyBlobUpload,
  UploadError,
  type StoredUpload,
} from "@/lib/gallery-storage";
import { cleanCaption } from "@/lib/gallery";

/**
 * Homepage gallery management. Open to every admin — like bookings and blocked
 * slots, this is day-to-day content work rather than an owner setting.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/gallery — every item, published or not, in display order,
 * plus which storage backend uploads will use (so the UI picks the right flow).
 */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ items: await listGalleryItems(), storage: storageMode() });
  } catch (err) {
    console.error("[admin/gallery] GET error:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to load the gallery. Has the gallery_items migration been run?" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/gallery — add an item. Two shapes, matching the backend:
 *
 * - JSON `{ blobUrl, caption?, published? }` — the browser has already uploaded
 *   the file to Vercel Blob; we verify it and record it.
 * - multipart `file`, `caption`, `published` ("true" | "false") — disk storage.
 */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = storageMode();
  if (mode === "unavailable") {
    return NextResponse.json(
      { error: "File storage isn't set up. Connect a Vercel Blob store to this project, then redeploy." },
      { status: 503 }
    );
  }

  let stored: StoredUpload;
  let caption: string;
  let published: boolean;

  try {
    if (mode === "blob") {
      let body: { blobUrl?: unknown; caption?: unknown; published?: unknown };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Expected JSON with the uploaded blobUrl." }, { status: 400 });
      }
      if (typeof body.blobUrl !== "string" || !URL.canParse(body.blobUrl)) {
        return NextResponse.json({ error: "blobUrl is required." }, { status: 400 });
      }
      caption = cleanCaption(body.caption);
      published = body.published !== false;
      stored = await verifyBlobUpload(body.blobUrl);
    } else {
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
      }
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
      }
      caption = cleanCaption(form.get("caption"));
      published = form.get("published") !== "false";
      stored = await saveUpload(file);
    }
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/gallery] storing upload failed:", err);
    return NextResponse.json({ error: "Could not save the file." }, { status: 500 });
  }

  try {
    const item = await createGalleryItem(stored, caption, published);
    revalidatePath("/");
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    // Don't leave an orphaned file behind when the row could not be written.
    await deleteStoredFile(stored.src, stored.storageKey).catch(() => {});
    console.error("[admin/gallery] insert failed:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to save the gallery item." },
      { status: 500 }
    );
  }
}
