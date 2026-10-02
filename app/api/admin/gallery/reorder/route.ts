import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db";
import { reorderGallery } from "@/lib/gallery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/admin/gallery/reorder — body `{ ids: number[] }`, every item id in its new order. */
export async function PUT(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: unknown;
  try {
    ids = (await req.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    return NextResponse.json({ error: "ids must be an array of item ids" }, { status: 400 });
  }

  try {
    if (!(await reorderGallery(ids))) {
      return NextResponse.json(
        { error: "The gallery changed since this page loaded. Refresh and try again." },
        { status: 409 }
      );
    }
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/gallery] reorder error:", err);
    return NextResponse.json(
      { error: friendlyDbError(err) ?? "Failed to save the new order." },
      { status: 500 }
    );
  }
}
