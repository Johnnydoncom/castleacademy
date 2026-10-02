"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { upload as blobUpload } from "@vercel/blob/client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Film,
  ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/field";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_MEDIA,
  MAX_CAPTION_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  formatMb,
  type GalleryItem,
  type GalleryStorage,
} from "@/lib/gallery";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    return (await res.json())?.error ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Disk backend: XHR rather than fetch so the admin sees upload progress — a
 * 100 MB video on a Lagos connection can take a while.
 */
function uploadToDisk(form: FormData, onProgress: (pct: number) => void) {
  return new Promise<GalleryItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/gallery");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { item?: GalleryItem; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON usually means a proxy in front of the app rejected the body.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.item) resolve(body.item);
      else if (xhr.status === 413 && !body.error) reject(new Error("The server rejected the file as too large."));
      else reject(new Error(body.error ?? `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
    xhr.send(form);
  });
}

/** Blob filenames: keep them readable but restricted to what the token route accepts. */
function blobPathname(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "upload";
  return `gallery/${base}${ext ? `.${ext}` : ""}`;
}

/**
 * Vercel Blob backend: the file goes straight from the browser to Blob (so no
 * Function body limit applies), then we ask the server to verify and record it.
 */
async function uploadToBlob(
  file: File,
  caption: string,
  published: boolean,
  onProgress: (pct: number) => void
): Promise<GalleryItem> {
  const blob = await blobUpload(blobPathname(file.name), file, {
    access: "public",
    handleUploadUrl: "/api/admin/gallery/upload",
    clientPayload: file.type.startsWith("video/") ? "video" : "image",
    contentType: file.type || undefined,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  onProgress(100);
  const res = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blobUrl: blob.url, caption, published }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to save the upload"));
  return (await res.json()).item as GalleryItem;
}

// ── Upload card ──────────────────────────────────────────────────────────────

function UploadCard({
  storage,
  onUploaded,
}: {
  storage: GalleryStorage | null;
  onUploaded: (item: GalleryItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [publish, setPublish] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isVideo = file?.type.startsWith("video/") ?? false;

  const pick = (f: File | undefined) => {
    if (!f) return;
    const video = f.type.startsWith("video/");
    if (!video && !f.type.startsWith("image/")) {
      return toast.error("Choose an image or a video file.");
    }
    const limit = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (f.size > limit) {
      return toast.error(`${video ? "Videos" : "Images"} must be ${formatMb(limit)} or smaller.`);
    }
    setFile(f);
  };

  const reset = () => {
    setFile(null);
    setCaption("");
    setPublish(true);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file to upload.");
    setProgress(0);
    try {
      let item: GalleryItem;
      if (storage === "blob") {
        item = await uploadToBlob(file, caption, publish, setProgress);
      } else {
        const form = new FormData();
        form.append("file", file);
        form.append("caption", caption);
        form.append("published", String(publish));
        item = await uploadToDisk(form, setProgress);
      }
      toast.success(publish ? "Uploaded and live on the homepage" : "Uploaded as hidden");
      onUploaded(item);
      reset();
    } catch (err) {
      toast.error((err as Error).message);
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  if (storage === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="font-semibold">Uploads need a Vercel Blob store</h2>
            <p>
              This site runs on Vercel, where the server can&apos;t keep uploaded files. In the Vercel
              dashboard, open this project&apos;s <strong>Storage</strong> tab, choose{" "}
              <strong>Create → Blob</strong> with <strong>Public</strong>
              {" access, connect it to this project, then redeploy. It's free on the Hobby plan (1 GB)."}
            </p>
            <p className="text-amber-800/80">
              You can still reorder, hide and caption the existing items below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-semibold text-foreground">Add to Gallery</h2>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Drop zone / preview */}
        {file && preview ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-zinc-950">
            <div className="relative aspect-video">
              {isVideo ? (
                <video src={preview} className="absolute inset-0 h-full w-full object-contain" controls muted playsInline />
              ) : (
                <img src={preview} alt="Selected file preview" className="absolute inset-0 h-full w-full object-contain" />
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2 text-xs text-zinc-300">
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-zinc-500">{formatMb(file.size)}</span>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={reset}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-black"
                aria-label="Remove selected file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="gallery-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition",
              dragging ? "border-gold bg-gold/5" : "border-border hover:border-gold/60 hover:bg-muted/30"
            )}
          >
            <UploadCloud className="h-8 w-8 text-gold" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Drop a file here, or click to browse</span>
            <span className="text-xs text-muted-foreground">
              Images (JPG, PNG, WebP, GIF, AVIF) up to {formatMb(MAX_IMAGE_BYTES)} · Videos (MP4, MOV, WebM) up to{" "}
              {formatMb(MAX_VIDEO_BYTES)}
            </span>
          </label>
        )}
        <input
          ref={inputRef}
          id="gallery-file"
          type="file"
          accept={ACCEPTED_MEDIA}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {/* Details */}
        <div className="flex flex-col gap-5">
          <Field label="Caption" htmlFor="gallery-caption" hint={`${caption.length}/${MAX_CAPTION_LENGTH}`} className="mb-0">
            <Input
              id="gallery-caption"
              value={caption}
              maxLength={MAX_CAPTION_LENGTH}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Classroom setup — 24 seats"
              className="bg-muted/30"
            />
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">
            Shown under the slide and read out by screen readers.
          </p>

          <div className="flex items-center gap-3">
            <Switch id="gallery-publish" checked={publish} onCheckedChange={setPublish} />
            <Label htmlFor="gallery-publish" className="text-sm font-normal">
              Show on the homepage straight away
            </Label>
          </div>

          <div className="mt-auto space-y-3">
            {uploading && (
              <div className="space-y-1.5" aria-live="polite">
                <Progress value={progress} className="h-1.5 bg-muted [&>div]:bg-gold" />
                <p className="text-xs text-muted-foreground">
                  {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
                </p>
              </div>
            )}
            <Button
              type="submit"
              disabled={!file || uploading || storage === null}
              className="w-full gap-2 bg-gold text-royal-deep shadow-sm hover:bg-gold/90 sm:w-auto"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Item card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  index,
  total,
  busy,
  onMove,
  onPatch,
  onDelete,
}: {
  item: GalleryItem;
  index: number;
  total: number;
  busy: boolean;
  onMove: (from: number, to: number) => void;
  onPatch: (id: number, patch: { caption?: string; published?: boolean }) => Promise<boolean>;
  onDelete: (item: GalleryItem) => void;
}) {
  const [caption, setCaption] = useState(item.caption);
  const [saving, setSaving] = useState(false);

  // Keep in step when the list is refetched.
  useEffect(() => setCaption(item.caption), [item.caption]);

  const saveCaption = async () => {
    const next = caption.trim();
    if (next === item.caption) return setCaption(item.caption);
    setSaving(true);
    const ok = await onPatch(item.id, { caption: next });
    setSaving(false);
    if (!ok) setCaption(item.caption);
  };

  const captionId = `caption-${item.id}`;

  return (
    <li
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition",
        item.published ? "border-border/60" : "border-dashed border-border opacity-75"
      )}
    >
      <div className="relative aspect-video bg-zinc-950">
        {item.type === "video" ? (
          <video src={item.src} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" controls />
        ) : (
          <img src={item.src} alt={item.caption || "Gallery image"} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
          {item.type === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
          {String(index + 1).padStart(2, "0")}
        </span>
        {!item.published && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-black">
            Hidden
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Label htmlFor={captionId} className="sr-only">
            Caption for item {index + 1}
          </Label>
          <div className="relative">
            <Input
              id={captionId}
              value={caption}
              maxLength={MAX_CAPTION_LENGTH}
              placeholder="Add a caption"
              onChange={(e) => setCaption(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setCaption(item.caption);
                  e.currentTarget.blur();
                }
              }}
              disabled={saving}
              className="bg-muted/30 pr-8 text-sm"
            />
            {saving && (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id={`published-${item.id}`}
              checked={item.published}
              disabled={busy}
              onCheckedChange={(v) => onPatch(item.id, { published: v })}
            />
            <Label htmlFor={`published-${item.id}`} className="text-xs font-normal text-muted-foreground">
              {item.published ? "Visible" : "Hidden"}
            </Label>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={busy || index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`Move item ${index + 1} earlier`}
              title="Move earlier"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={busy || index === total - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`Move item ${index + 1} later`}
              title="Move later"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              onClick={() => onDelete(item)}
              aria-label={`Delete item ${index + 1}`}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Manager ──────────────────────────────────────────────────────────────────

export function GalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [storage, setStorage] = useState<GalleryStorage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GalleryItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gallery", { cache: "no-store" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to load the gallery"));
      const data = await res.json();
      setItems(data.items ?? []);
      setStorage(data.storage ?? "disk");
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const patchItem = async (id: number, patch: { caption?: string; published?: boolean }) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to save"));
      const { item } = (await res.json()) as { item: GalleryItem };
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      if (patch.published !== undefined) toast.success(patch.published ? "Now visible on the homepage" : "Hidden from the homepage");
      else toast.success("Caption saved");
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const move = async (from: number, to: number) => {
    const previous = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next); // optimistic
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gallery/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((i) => i.id) }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to save the new order"));
    } catch (err) {
      setItems(previous);
      toast.error((err as Error).message);
      fetchItems();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gallery/${target.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete"));
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      toast.success("Removed from the gallery");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const visible = items.filter((i) => i.published).length;

  return (
    <div className="max-w-6xl space-y-8">
      <UploadCard storage={storage} onUploaded={(item) => setItems((prev) => [...prev, item])} />

      <section aria-labelledby="gallery-items-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="gallery-items-heading" className="text-sm font-semibold text-foreground">
              Gallery Items
            </h2>
            {!loading && !loadError && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {visible} of {items.length} shown on the homepage, in this order.
              </p>
            )}
          </div>
          <a
            href="/#gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
          >
            View on site <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading gallery…</span>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p>{loadError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); fetchItems(); }}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
            No gallery items yet. The gallery section is hidden on the homepage until you add one.
          </div>
        ) : (
          <>
            {visible === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Every item is hidden, so the gallery section is not shown on the homepage.
              </p>
            )}
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  total={items.length}
                  busy={busy}
                  onMove={move}
                  onPatch={patchItem}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {pendingDelete?.type ?? "item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.uploaded
                ? "It will be removed from the homepage and the uploaded file deleted from storage. This cannot be undone."
                : "It will be removed from the homepage. To keep it but stop showing it, switch it to hidden instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
