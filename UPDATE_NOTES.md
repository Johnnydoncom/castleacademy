# Castle Academy — Dynamic Gallery (October 2026)

The homepage gallery is now managed from **Admin → Gallery** (`/admin/gallery`),
open to every admin (not owner-only). Admins can:

- **Upload** images (JPG, PNG, WebP, GIF, AVIF — up to 10 MB) and videos
  (MP4, MOV, WebM — up to 100 MB), with a caption and an optional "hidden" start.
- **Show / hide** any item without deleting it.
- **Reorder** items (arrow buttons) — the homepage follows this order.
- **Edit captions** inline (saved on blur / Enter) and **delete** items.

Changes appear on the homepage immediately (`revalidatePath("/")`). If every item
is hidden, the gallery section is left off the homepage.

## Setup

```bash
npx drizzle-kit migrate   # applies 20261002132714_gallery_items
```

The migration creates `gallery_items` and seeds it with the six items that used
to be hardcoded, so the homepage looks the same until an admin changes it.
If the table is missing or the DB is unreachable, the homepage falls back to
those same six items.

## Where uploads are stored — read before deploying

### On Vercel (production): Vercel Blob — one-time setup

Vercel's server filesystem is read-only, so uploads go to **Vercel Blob**
(free on Hobby: 1 GB storage, 10 GB transfer/month; if a limit is hit Blob
pauses until the next cycle — you are never billed).

1. Vercel dashboard → this project → **Storage** → **Create** → **Blob**.
2. Choose **Public** access, connect it to this project (Production + Preview,
   and Development if you want it locally).
3. **Redeploy.** This adds `BLOB_READ_WRITE_TOKEN`, which switches the gallery
   to Blob automatically.

Until then, the Gallery page shows a notice and uploads are disabled (existing
items can still be hidden, reordered and captioned).

How it works: the browser uploads the file **directly to Blob** using a
short-lived token from `POST /api/admin/gallery/upload` (admins only, scoped to
`gallery/`, limited to image/video types and 10 MB / 100 MB). The server then
checks the stored file's real bytes and size before saving it, and deletes it
if it fails. Deleting a gallery item deletes the blob.

### Elsewhere (local dev, VPS / cPanel): local disk

Without `BLOB_READ_WRITE_TOKEN` (and not on Vercel), uploads are written to
**`storage/gallery/`** (gitignored) and streamed back by
`GET /api/gallery/media/<file>` (with Range support for video seeking).

- The folder must persist across deploys; set `GALLERY_UPLOAD_DIR` to a path
  outside the app directory if releases replace it.
- A reverse proxy in front of Node must allow ~110 MB request bodies for videos.

File types are verified from the file's bytes, not its name or the browser's
MIME type. SVG is rejected (it can carry script). Uploaded files get random UUID
names, so URLs can't be guessed and are safe to cache forever.

**New:** `lib/gallery.ts`, `lib/gallery-store.ts`, `lib/gallery-storage.ts`,
`app/api/admin/gallery/upload/route.ts` (Blob tokens), `app/admin/gallery/page.tsx`, `components/admin/gallery-manager.tsx`,
`app/api/admin/gallery/**`, `app/api/gallery/media/[file]/route.ts`,
`lib/db/migrations/20261002132714_gallery_items/`.
**Modified:** `components/gallery.tsx` (data-driven; only the visible video plays;
counter works past 9 items), `app/page.tsx`, `components/admin/admin-sidebar.tsx`,
`lib/db/schema.ts`, `.gitignore`.

---

# Castle Academy — Feature Update (July 2026)

This update adds automatic PDF invoicing, a customer self-service portal,
role-based admin access, and several booking-robustness features.

## 1. Setup — run these two commands

```bash
# 1. Install the new PDF dependency (pdfkit)
npm install

# 2. Apply BOTH database migrations, in order.
#    005 = roles, customers, reschedule fields, constraint fix
#    006 = password-reset tokens (required for "forgot password")
node lib/run_migration_005.mjs
node lib/run_migration_006.mjs
#   — or —
psql $DATABASE_URL -f lib/migrations/005_rbac_customers_reschedule.sql
psql $DATABASE_URL -f lib/migrations/006_password_resets.sql
```

> **If customer signup/login returns an error**, it almost always means the
> `customers` table doesn't exist yet — i.e. migration **005** hasn't been applied
> to the database `DATABASE_URL` points at. The auth routes now return a clear
> "run the latest database migration" message instead of a generic 500 so this is
> obvious. Run both migrations above and retry.

Optional new env var (falls back to `ADMIN_SECRET` if unset):

```env
# Secret for the auto-expire cron endpoint (see §5)
CRON_SECRET=some-long-random-string
```

---

## 2. Automatic PDF invoices & receipts

`lib/invoice.ts` generates branded A4 PDFs with pdfkit (no browser needed).

- **On booking:** a pro-forma **invoice** PDF is attached to the customer's request email.
- **On payment (Nomba webhook):** a **receipt** PDF (with a PAID mark) is attached to the confirmation email.
- **On demand:** download from the customer portal or admin bookings table, or via
  `GET /api/customer/invoice/<ref>?type=invoice|receipt` and `GET /api/admin/invoice/<ref>?...`.

Currency is rendered as `NGN 100,000` (the standard PDF fonts have no ₦ glyph).

---

## 3. Admin roles — owner vs admin (RBAC)

A `role` column was added to `admins` (`owner` | `admin`). The seeded **castacadmin**
account is promoted to **owner**. Newly created admins are regular `admin`s.

Restricted to the **owner** only:

- **Venue Settings** page (opening hours, social links) and its APIs
- **Admin Accounts** page and its APIs
- **Total Revenue** metric + revenue chart on the dashboard
- **Danger Zone** reset-all-bookings

Regular admins keep full access to Bookings and Blocked Slots. The sidebar hides
owner-only links, owner-only pages show an "owner access required" notice, and the
APIs enforce it server-side (`lib/auth.ts` → `getAdminSession()` / `isOwner()`).

---

## 4. Customer portal — `/account`

Mobile-responsive self-service dashboard (email + password auth):

- **Sign up / sign in** — guest bookings made with the same email are auto-linked.
- **Forgot password** — "Forgot password?" on the sign-in card emails a one-hour
  reset link (`/reset-password?token=…`). Uses `password_reset_tokens` (migration 006);
  raw tokens are never stored (only their SHA-256 hash). No account-enumeration: the
  "forgot" endpoint always returns the same response whether or not the email exists.
- **My Bookings** — status, payment, totals; download invoice/receipt PDFs; "Pay Now"
  for unpaid bookings; email-me-my-invoice/receipt; request a reschedule.
- **Profile** — update name/phone and change password.

Auth routes (`register`, `login`, `password/*`) now map known DB errors (missing table,
stale schema, unreachable DB, duplicate email) to clear, actionable messages via
`friendlyDbError()` in `lib/db.ts`, instead of an opaque 500.

APIs live under `/api/customer/*`. Session cookie: `customer_session` (separate from admin).
A "My Account" link was added to the site nav, the booking success panel, and the payment
callback page.

---

## 5. Booking robustness extras

- **Auto-expire stale pending bookings** — `GET/POST /api/cron/expire-pending` marks
  unpaid pending bookings older than 6h as `expired`. Call it from a scheduler, or hit it
  manually as owner. (A new `expired` status was added.)
- **Resend invoice / payment link** — customers can re-email their invoice or receipt;
  admins can still copy the Nomba pay link.
- **Reschedule requests** — customers request a new slot (>7 days out, per policy); admins
  approve (applies the new slot) or decline from the bookings table. Admin is emailed on request.
- **Bug fix** — the `bookings.payment_status` CHECK constraint now allows `failed` and
  `reversed`, which the Nomba webhook already writes (previously would have thrown).

---

## 6. Files changed / added

**New:** `lib/invoice.ts`, `lib/mailer.ts`, `lib/customer-auth.ts`,
`lib/migrations/005_*.sql`, `lib/run_migration_005.mjs`, `app/account/*`,
`components/account/*`, `components/admin/owner-only-notice.tsx`,
`app/api/customer/*`, `app/api/admin/me`, `app/api/admin/invoice/[ref]`,
`app/api/cron/expire-pending`.

**Modified:** `lib/auth.ts`, `next.config.ts`, `package.json`, `app/api/book/route.ts`,
`app/api/webhooks/nomba/route.ts`, `app/api/admin/{dashboard,bookings,venue-hours,admins,reset-bookings}/route.ts`,
`app/api/social/route.ts`, `app/admin/{settings,admins}/page.tsx`,
`components/admin/{admin-sidebar,admin-dashboard,dashboard-metrics,admin-management,bookings-table}.tsx`,
`components/nav.tsx`, `components/booking.tsx`, `app/booking/callback/page.tsx`.
