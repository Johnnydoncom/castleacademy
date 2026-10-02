/**
 * Gallery types and limits shared by the homepage, the admin manager and the
 * API routes. Kept free of server imports so client components can use it.
 */

export type MediaType = "image" | "video";

/** Where uploads go — see lib/gallery-storage.ts. */
export type GalleryStorage = "blob" | "disk" | "unavailable";

/** What the homepage needs to render one slide. */
export interface GallerySlide {
  id: number;
  type: MediaType;
  src: string;
  caption: string;
}

/** Full record as the admin dashboard sees it. */
export interface GalleryItem extends GallerySlide {
  published: boolean;
  sortOrder: number;
  mimeType: string | null;
  sizeBytes: number | null;
  /** True for files uploaded through the dashboard (vs bundled /images assets). */
  uploaded: boolean;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_CAPTION_LENGTH = 200;

/** `accept` attribute for the admin file picker — the server re-checks content. */
export const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/quicktime,video/webm";

export function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(/\.0$/, "")} MB`;
}

/**
 * Shown when the gallery table is missing or unreachable, so the homepage
 * never loses its gallery to a database hiccup. Matches the migration seed.
 */
export const DEFAULT_GALLERY: GallerySlide[] = [
  { id: -1, type: "video", src: "/images/castle-academy-training-space-tour.mp4", caption: "Full space tour" },
  { id: -2, type: "image", src: "/images/training-room-classroom-setup.jpeg", caption: "Classroom setup — 24 seats" },
  { id: -3, type: "image", src: "/images/training-room-smart-tv-presentation.jpeg", caption: "Smart TV & presentation wall" },
  { id: -4, type: "image", src: "/images/training-room-front-perspective.jpeg", caption: "Bright, focused learning environment" },
  { id: -5, type: "image", src: "/images/training-room-full-view-back.jpeg", caption: "Space for strategy sessions" },
  { id: -6, type: "image", src: "/images/training-room-interactive-display.jpeg", caption: "Interactive display and premium AV" },
];

/** Trim, collapse whitespace and cap length. React escapes it on render. */
export function cleanCaption(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_CAPTION_LENGTH);
}
