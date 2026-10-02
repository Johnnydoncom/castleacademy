import { Readable } from "stream";
import { mimeForKey, readUpload, statUpload } from "@/lib/gallery-storage";

/**
 * GET /api/gallery/media/<storageKey>
 *
 * Streams an uploaded gallery file. Supports HTTP Range requests, which
 * browsers need to seek in (and, on Safari, to play at all) a <video>.
 * Keys are random and never reused, so responses are cached as immutable.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalid";

  let start: number;
  let end: number;
  if (m[1] === "") {
    // Suffix range: the last N bytes.
    const suffix = Number(m[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file: key } = await params;
  const info = await statUpload(key);
  if (!info) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": mimeForKey(key),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Last-Modified": info.mtime.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  });

  const range = parseRange(req.headers.get("range"), info.size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }

  const body = (r?: { start: number; end: number }) =>
    Readable.toWeb(readUpload(info.file, r)) as unknown as ReadableStream;

  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(body(range), { status: 206, headers });
  }

  headers.set("Content-Length", String(info.size));
  return new Response(body(), { status: 200, headers });
}
