import { db } from "./db";
import { galleryItems } from "./db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { DEFAULT_GALLERY, type GalleryItem, type GallerySlide, type MediaType } from "./gallery";
import { deleteUpload, mediaUrl, type StoredUpload } from "./gallery-storage";

/**
 * Database access for the homepage gallery. Server-only.
 */

type Row = typeof galleryItems.$inferSelect;

function toItem(r: Row): GalleryItem {
  return {
    id: r.id,
    type: r.mediaType === "video" ? "video" : "image",
    src: r.src,
    caption: r.caption,
    published: r.isPublished === 1,
    sortOrder: r.sortOrder,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    uploaded: r.storageKey !== null,
  };
}

/**
 * Published slides for the homepage, in display order. An empty list is a
 * valid answer (the admin hid everything); only a failed query falls back to
 * the bundled defaults.
 */
export async function loadPublishedGallery(): Promise<GallerySlide[]> {
  try {
    const rows = await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.isPublished, 1))
      .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id));
    return rows.map(({ id, mediaType, src, caption }) => ({
      id,
      type: (mediaType === "video" ? "video" : "image") as MediaType,
      src,
      caption,
    }));
  } catch (err) {
    console.error("[gallery] load failed, using defaults:", (err as Error).message);
    return DEFAULT_GALLERY;
  }
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  const rows = await db
    .select()
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id));
  return rows.map(toItem);
}

async function getRow(id: number): Promise<Row | null> {
  const rows = await db.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Insert an uploaded file at the end of the gallery. */
export async function createGalleryItem(
  upload: StoredUpload,
  caption: string,
  published: boolean
): Promise<GalleryItem> {
  const [{ next }] = await db
    .select({ next: sql<number>`COALESCE(MAX(${galleryItems.sortOrder}), -1) + 1` })
    .from(galleryItems);

  await db.insert(galleryItems).values({
    mediaType: upload.mediaType,
    src: mediaUrl(upload.storageKey),
    storageKey: upload.storageKey,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    caption,
    sortOrder: Number(next),
    isPublished: published ? 1 : 0,
  });

  // storage_key is unique, so it identifies the row we just wrote.
  const rows = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.storageKey, upload.storageKey))
    .limit(1);
  return toItem(rows[0]);
}

export async function updateGalleryItem(
  id: number,
  patch: { caption?: string; published?: boolean }
): Promise<GalleryItem | null> {
  const values: Partial<typeof galleryItems.$inferInsert> = {};
  if (patch.caption !== undefined) values.caption = patch.caption;
  if (patch.published !== undefined) values.isPublished = patch.published ? 1 : 0;

  if (Object.keys(values).length > 0) {
    await db
      .update(galleryItems)
      .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(galleryItems.id, id));
  }
  const row = await getRow(id);
  return row ? toItem(row) : null;
}

/** Remove the row and, for uploads, the file behind it. Returns false if absent. */
export async function deleteGalleryItem(id: number): Promise<boolean> {
  const row = await getRow(id);
  if (!row) return false;
  await db.delete(galleryItems).where(eq(galleryItems.id, id));
  // Row first: a leftover file is harmless, a row pointing at nothing is not.
  if (row.storageKey) {
    await deleteUpload(row.storageKey).catch((err) =>
      console.error("[gallery] could not delete file", row.storageKey, err)
    );
  }
  return true;
}

/**
 * Apply a new display order. `ids` must list every item exactly once, so a
 * stale dashboard tab cannot silently drop items it never saw.
 */
export async function reorderGallery(ids: number[]): Promise<boolean> {
  const existing = await db.select({ id: galleryItems.id }).from(galleryItems);
  const known = new Set(existing.map((r) => r.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    return false;
  }
  if (ids.length === 0) return true;

  const cases = sql.join(
    ids.map((id, i) => sql`WHEN ${id} THEN ${i}`),
    sql` `
  );
  await db
    .update(galleryItems)
    .set({ sortOrder: sql`CASE ${galleryItems.id} ${cases} END` })
    .where(inArray(galleryItems.id, ids));
  return true;
}
