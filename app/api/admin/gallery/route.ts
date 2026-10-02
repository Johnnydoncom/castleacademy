import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db";
import { createGalleryItem, listGalleryItems } from "@/lib/gallery-store";
import { deleteUpload, saveUpload, UploadError } from "@/lib/gallery-storage";
import { cleanCaption } from "@/lib/gallery";

/**
 * Homepage gallery management. Open to every admin — like bookings and blocked
 * slots, this is day-to-day content work rather than an owner setting.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/gallery — every item, published or not, in display order. */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ items: await listGalleryItems() });
  } catch (err) {
    console.error("[admin/gallery] GET error:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to load the gallery. Has the gallery_items migration been run?" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/gallery — multipart upload.
 * Fields: `file` (required), `caption`, `published` ("true" | "false", default true).
 */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const caption = cleanCaption(form.get("caption"));
  const published = form.get("published") !== "false";

  let stored;
  try {
    stored = await saveUpload(file);
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/gallery] upload write failed:", err);
    return NextResponse.json({ error: "Could not save the file on the server." }, { status: 500 });
  }

  try {
    const item = await createGalleryItem(stored, caption, published);
    revalidatePath("/");
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    // Don't leave an orphaned file behind when the row could not be written.
    await deleteUpload(stored.storageKey).catch(() => {});
    console.error("[admin/gallery] insert failed:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to save the gallery item." },
      { status: 500 }
    );
  }
}
