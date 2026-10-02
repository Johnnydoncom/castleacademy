import { createReadStream, createWriteStream } from "fs";
import { mkdir, stat, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { del, head, BlobNotFoundError } from "@vercel/blob";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  formatMb,
  type GalleryStorage,
  type MediaType,
} from "./gallery";

/**
 * Storage for gallery uploads. Server-only. Two backends:
 *
 * - **Vercel Blob** (when BLOB_READ_WRITE_TOKEN is set — i.e. a Blob store is
 *   connected to the Vercel project). The browser uploads straight to Blob
 *   with a short-lived token from `/api/admin/gallery/upload`, so files never
 *   pass through a Function. We then verify the stored file before saving it.
 *   Vercel's filesystem is read-only, so this is the only option there.
 *
 * - **Local disk** everywhere else (local dev, a VPS / cPanel Node host).
 *   Files live outside `public/` on purpose: `next start` only serves public
 *   files that existed at build time, so they are streamed back by
 *   `app/api/gallery/media/[file]/route.ts`. The directory must survive
 *   deploys — point GALLERY_UPLOAD_DIR at a persistent path if needed.
 */

export function storageMode(): GalleryStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  // On Vercel without a Blob store there is nowhere durable to write.
  if (process.env.VERCEL) return "unavailable";
  return "disk";
}

/** Uploaded items store an absolute Blob URL; disk uploads a site-relative path. */
export function isBlobSrc(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

// The ignore comments stop the file tracer from treating this runtime-only
// directory as a build input — without them it bundles the whole project into
// every Function that imports this module.
export const UPLOAD_DIR = process.env.GALLERY_UPLOAD_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.GALLERY_UPLOAD_DIR)
  : path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "gallery");

interface FormatInfo {
  mime: string;
  ext: string;
  mediaType: MediaType;
}

const FORMATS: Record<string, FormatInfo> = {
  jpg: { mime: "image/jpeg", ext: "jpg", mediaType: "image" },
  png: { mime: "image/png", ext: "png", mediaType: "image" },
  webp: { mime: "image/webp", ext: "webp", mediaType: "image" },
  gif: { mime: "image/gif", ext: "gif", mediaType: "image" },
  avif: { mime: "image/avif", ext: "avif", mediaType: "image" },
  mp4: { mime: "video/mp4", ext: "mp4", mediaType: "video" },
  mov: { mime: "video/quicktime", ext: "mov", mediaType: "video" },
  webm: { mime: "video/webm", ext: "webm", mediaType: "video" },
};

// Keys we generate are `<uuid>.<ext>`; anything else in a URL is rejected
// before it gets near the filesystem, which rules out path traversal.
const KEY_PATTERN = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${Object.keys(FORMATS).join("|")})$`
);

/**
 * Identify a file from its first bytes. The browser-supplied MIME type and
 * filename are not trusted — a renamed .html must not be served as an image.
 * SVG is deliberately unsupported: it can carry script.
 */
export function sniffFormat(head: Uint8Array): FormatInfo | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...head.subarray(start, end));

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return FORMATS.jpg;
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return FORMATS.png;
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return FORMATS.webp;
  if (ascii(0, 4) === "GIF8") return FORMATS.gif;
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return FORMATS.webm;
  }
  // ISO base media (MP4, MOV, AVIF) — `ftyp` box at offset 4, brand after it.
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return FORMATS.avif;
    if (brand === "qt  ") return FORMATS.mov;
    return FORMATS.mp4;
  }
  return null;
}

export class UploadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface StoredUpload {
  /** URL the site renders. */
  src: string;
  /** Disk filename, or Blob pathname. */
  storageKey: string;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
}

/** Validate an uploaded file and stream it to disk under a random name. */
export async function saveUpload(file: File): Promise<StoredUpload> {
  if (file.size === 0) throw new UploadError("The file is empty.");

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = sniffFormat(head);
  if (!format) {
    throw new UploadError(
      "Unsupported file type. Upload a JPG, PNG, WebP, GIF or AVIF image, or an MP4, MOV or WebM video."
    );
  }

  const limit = format.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new UploadError(
      `${format.mediaType === "video" ? "Videos" : "Images"} must be ${formatMb(limit)} or smaller.`,
      413
    );
  }

  await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
  const storageKey = `${randomUUID()}.${format.ext}`;
  const dest = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storageKey);

  // Count bytes as they pass rather than trusting `file.size` for the limit.
  let written = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      written += chunk.length;
      if (written > limit) cb(new UploadError(`File exceeds ${formatMb(limit)}.`, 413));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as WebReadableStream),
      guard,
      createWriteStream(/*turbopackIgnore: true*/ dest, { flags: "wx" })
    );
  } catch (err) {
    await unlink(/*turbopackIgnore: true*/ dest).catch(() => {});
    throw err;
  }

  return {
    src: mediaUrl(storageKey),
    storageKey,
    mimeType: format.mime,
    mediaType: format.mediaType,
    sizeBytes: written,
  };
}

// ── Vercel Blob ──────────────────────────────────────────────────────────────

/** Folder inside the Blob store; also checked so tokens can't write elsewhere. */
export const BLOB_PREFIX = "gallery/";
const BLOB_PATHNAME = /^gallery\/[A-Za-z0-9._-]{1,100}$/;

const MIME_BY_TYPE: Record<MediaType, string[]> = {
  image: Object.values(FORMATS).filter((f) => f.mediaType === "image").map((f) => f.mime),
  video: Object.values(FORMATS).filter((f) => f.mediaType === "video").map((f) => f.mime),
};

/**
 * Constraints baked into a client upload token. Vercel Blob enforces them, so
 * a token issued for an image can't be used to push a 100 MB file or a
 * different content type. `kind` comes from the client and only selects which
 * (stricter or looser) set applies — the bytes are re-checked afterwards.
 */
export function blobTokenOptions(pathname: string, kind: string | null) {
  if (!BLOB_PATHNAME.test(pathname)) throw new UploadError("Invalid upload path.");
  const mediaType: MediaType = kind === "video" ? "video" : "image";
  return {
    allowedContentTypes: MIME_BY_TYPE[mediaType],
    maximumSizeInBytes: mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
    addRandomSuffix: true,
    validUntil: Date.now() + 30 * 60 * 1000,
  };
}

/**
 * Confirm a client-reported Blob URL really is a gallery file in *our* store,
 * within the size limit, and of a supported format judged by its bytes.
 * Anything that fails is deleted so it can't linger in the store.
 */
export async function verifyBlobUpload(url: string): Promise<StoredUpload> {
  let info;
  try {
    info = await head(url);
  } catch (err) {
    if (err instanceof BlobNotFoundError) throw new UploadError("Uploaded file not found.");
    throw err;
  }
  // head() resolves by pathname, so compare origins too — a look-alike URL on
  // another host must not end up rendered on the homepage.
  if (new URL(info.url).origin !== new URL(url).origin || !info.pathname.startsWith(BLOB_PREFIX)) {
    throw new UploadError("Uploaded file not found.");
  }

  const reject = async (message: string, status = 400): Promise<never> => {
    await del(info.url).catch(() => {});
    throw new UploadError(message, status);
  };

  const res = await fetch(info.url, { headers: { range: "bytes=0-15" }, cache: "no-store" });
  if (!res.ok) return reject("Could not read the uploaded file.", 502);
  const format = sniffFormat(new Uint8Array(await res.arrayBuffer()).subarray(0, 16));
  if (!format) {
    return reject(
      "Unsupported file type. Upload a JPG, PNG, WebP, GIF or AVIF image, or an MP4, MOV or WebM video."
    );
  }
  const limit = format.mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (info.size > limit) {
    return reject(`${format.mediaType === "video" ? "Videos" : "Images"} must be ${formatMb(limit)} or smaller.`, 413);
  }

  return {
    src: info.url,
    storageKey: info.pathname,
    mimeType: format.mime,
    mediaType: format.mediaType,
    sizeBytes: info.size,
  };
}

/** Remove the file behind an uploaded item, whichever backend holds it. */
export async function deleteStoredFile(src: string, storageKey: string): Promise<void> {
  if (isBlobSrc(src)) await del(src);
  else await deleteUpload(storageKey);
}

/** Absolute path for a storage key, or null if the key is not one we issue. */
export function resolveUploadPath(storageKey: string): string | null {
  if (!KEY_PATTERN.test(storageKey)) return null;
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storageKey);
}

export function mimeForKey(storageKey: string): string {
  const ext = storageKey.slice(storageKey.lastIndexOf(".") + 1);
  return FORMATS[ext]?.mime ?? "application/octet-stream";
}

export async function deleteUpload(storageKey: string): Promise<void> {
  const file = resolveUploadPath(storageKey);
  if (!file) return;
  await unlink(/*turbopackIgnore: true*/ file).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

/** Public URL the site uses to render an uploaded file. */
export function mediaUrl(storageKey: string): string {
  return `/api/gallery/media/${storageKey}`;
}

export async function statUpload(storageKey: string) {
  const file = resolveUploadPath(storageKey);
  if (!file) return null;
  try {
    const s = await stat(/*turbopackIgnore: true*/ file);
    return s.isFile() ? { file, size: s.size, mtime: s.mtime } : null;
  } catch {
    return null;
  }
}

export function readUpload(file: string, range?: { start: number; end: number }) {
  return createReadStream(/*turbopackIgnore: true*/ file, range);
}
