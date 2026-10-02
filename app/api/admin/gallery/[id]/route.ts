import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db";
import { deleteGalleryItem, updateGalleryItem } from "@/lib/gallery-store";
import { cleanCaption } from "@/lib/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(params: Ctx["params"]): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** PATCH /api/admin/gallery/<id> — body `{ caption?, published? }`. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: { caption?: unknown; published?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: { caption?: string; published?: boolean } = {};
  if (body.caption !== undefined) patch.caption = cleanCaption(body.caption);
  if (body.published !== undefined) {
    if (typeof body.published !== "boolean") {
      return NextResponse.json({ error: "published must be true or false" }, { status: 400 });
    }
    patch.published = body.published;
  }

  try {
    const item = await updateGalleryItem(id, patch);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidatePath("/");
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error("[admin/gallery] PATCH error:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to update the gallery item." },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/gallery/<id> — removes the item and any uploaded file. */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    if (!(await deleteGalleryItem(id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/gallery] DELETE error:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to delete the gallery item." },
      { status: 500 }
    );
  }
}
