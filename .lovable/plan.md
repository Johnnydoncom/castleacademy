
# Castle Academy — Training Space Booking Landing Page

Premium, warm-professional Nigerian landing page built around the new logo (royal blue + gold graduation-cap mark). The uploaded logo is used as-is in the nav, footer, and favicon, and the entire palette is derived from it so the logo sits perfectly on every surface.

## Logo & derived palette
Sampled from the uploaded logo mockup:
- **Royal Blue** `#1E3A8F` — primary brand background (the logo's blue field)
- **Deep Navy** `#122256` — darker sections, footer, headings on light
- **Academy Gold** `#D4A24C` — accent, CTAs, underlines, price highlight
- **Soft Gold** `#E8C77A` — hover / secondary accent
- **Ivory** `#F7F2E9` — warm off-white page background
- **Cream Card** `#FFFBF2` — card surfaces on ivory
- **Muted Ink** `#2A2E3A` / **Muted Text** `#5A6070`

Why this works with the logo: sections alternate ivory ↔ royal blue. The logo drops onto blue sections at full color, and onto ivory sections we use a blue-background badge/tile behind the same logo so its blue field stays intact (never floating white letters on cream). Gold CTAs echo the wordmark.

## Logo usage
- Register upload via `lovable-assets` from `/mnt/user-uploads/The_Castle_Academy_Logo.jpeg` → `src/assets/castle-academy-logo.jpeg.asset.json`.
- **Nav (ivory)**: logo shown inside a small royal-blue rounded tile (~48px tall) so its blue background is preserved.
- **Hero (royal blue section)**: logo used full-bleed at natural color, no tile needed.
- **Footer (deep navy)**: larger logo, natural color.
- **Favicon**: crop/generate a square PNG of the cap mark + "CA" into `public/favicon.png`, wire in `__root.tsx` head, delete default `public/favicon.ico`.

## Scope this turn
- Front-end only, single route (`/`), fully responsive.
- Complete polished copy for every requested section.
- Booking form validates client-side; submit → success toast. Real Sheets/email/Paystack/WhatsApp wiring offered as next step.
- Location placeholder: **Lekki, Lagos**. Phone/email placeholders kept.

## Typography
- Display: **Fraunces** (serif, echoes the logo's classical serif wordmark)
- Body: **Inter**
- Loaded via `<link>` in `src/routes/__root.tsx` head (never `@import` remote in styles.css).

## Sections (in order)
1. **Sticky nav** — logo (blue tile) left, anchor links, gold "Book Now" button right.
2. **Hero (royal-blue section)** — Eyebrow "Training Space Booking", serif headline "A Professional Space Where Great Learning Happens", subheadline mentioning Lekki, Lagos, two CTAs (gold "Book Now" + outline "Check Availability"), trust row (Paystack · Flutterwave · WhatsApp). Right: hero image with floating "Available today" gold chip.
3. **Why Choose Castle Academy (ivory)** — 7 tiles with gold-outline icons: 24-seat classroom setup, Smart TV, high-speed Wi-Fi, uninterrupted power, quality sound, fully AC, clean modern space.
4. **Perfect For (deep navy)** — 8 gold-bordered bento tiles: Corporate Trainings, Workshops, Seminars, Team Meetings, Professional Courses, Business Presentations, Coaching, Strategy Sessions.
5. **Pricing (ivory)** — Elevated cream card, blue header strip, gold price: ₦100,000 / up to 3 hrs; ₦30,000 / extra hour; custom full-day packages note; "Secure payment via Paystack / Flutterwave" line.
6. **How to Book (ivory)** — 4 numbered steps on a gold connecting line.
7. **Live Availability (ivory)** — Read-only shadcn Calendar preview + legend (Available / Limited / Booked) + real-time sync note.
8. **Gallery (royal blue)** — shadcn Carousel with 5 generated venue photos framed in gold.
9. **Booking form (ivory)** — Two-column cream card: left = supporting copy + WhatsApp confirmation reassurance, right = form (Full Name, Organisation optional, Phone, Email, Event Type select, Preferred Date, Start/End time, Participants, Additional Requirements, gold "Reserve My Space" button). react-hook-form + zod validation.
10. **Testimonials (deep navy)** — Rotating 3-card strip, Nigerian professionals.
11. **Location (ivory)** — Embedded Google Map (Lekki placeholder) + address block.
12. **Need Assistance (ivory)** — Phone (WhatsApp), email, warm reassurance copy.
13. **Final CTA (royal blue)** — Serif headline "Create Great Learning Experiences", gold button "Book Your Training Space Today".
14. **Footer (deep navy)** — Logo, quick links, socials, copyright.

## Technical notes
- Replace `src/routes/index.tsx`; add `head()` with real title/description/OG.
- Extend `src/styles.css` with palette tokens above (`oklch` equivalents), Fraunces/Inter families, and gold accent utilities.
- Sections as small components under `src/components/landing/*.tsx`.
- Generate 1 hero + 5 gallery images (warm editorial Nigerian training room) via `generate_image` into `src/assets/`.
- No backend calls this turn.

## Out of scope (offer as next step)
- Real Google Sheets write, email trigger, Paystack, WhatsApp auto-message, live calendar sync.
