import { createReadStream, createWriteStream } from "fs";
import { mkdir, stat, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, formatMb, type MediaType } from "./gallery";

/**
 * Disk storage for gallery uploads. Server-only.
 *
 * Files live outside `public/` on purpose: `next start` only serves public
 * files that existed at build time, so runtime uploads are streamed back by
 * `app/api/gallery/media/[file]/route.ts` instead. The directory must survive
 * deploys — point GALLERY_UPLOAD_DIR at a persistent path if the app folder is
 * replaced on each release.
 */

export const UPLOAD_DIR = process.env.GALLERY_UPLOAD_DIR
  ? path.resolve(process.env.GALLERY_UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "gallery");

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

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storageKey = `${randomUUID()}.${format.ext}`;
  const dest = path.join(UPLOAD_DIR, storageKey);

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
      createWriteStream(dest, { flags: "wx" })
    );
  } catch (err) {
    await unlink(dest).catch(() => {});
    throw err;
  }

  return { storageKey, mimeType: format.mime, mediaType: format.mediaType, sizeBytes: written };
}

/** Absolute path for a storage key, or null if the key is not one we issue. */
export function resolveUploadPath(storageKey: string): string | null {
  if (!KEY_PATTERN.test(storageKey)) return null;
  return path.join(UPLOAD_DIR, storageKey);
}

export function mimeForKey(storageKey: string): string {
  const ext = storageKey.slice(storageKey.lastIndexOf(".") + 1);
  return FORMATS[ext]?.mime ?? "application/octet-stream";
}

export async function deleteUpload(storageKey: string): Promise<void> {
  const file = resolveUploadPath(storageKey);
  if (!file) return;
  await unlink(file).catch((err: NodeJS.ErrnoException) => {
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
    const s = await stat(file);
    return s.isFile() ? { file, size: s.size, mtime: s.mtime } : null;
  } catch {
    return null;
  }
}

export function readUpload(file: string, range?: { start: number; end: number }) {
  return createReadStream(file, range);
}
