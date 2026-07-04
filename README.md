# Castle Academy — Next.js Static Site

A modern, fully equipped training venue booking site built with **Next.js 16** and exported as a fully static site. All SEO meta tags and JSON-LD structured data are rendered server-side into the raw HTML output.

## Tech Stack

- **Next.js 16** (static export via `output: 'export'`)
- **React 19**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **shadcn/ui** (Radix UI components)
- **react-hook-form** + **zod** (form validation)
- **Sonner** (toast notifications)

---

## Quick Start (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and set your Google Apps Script URL:

```env
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

> **Note:** If this variable is not set, the booking form will log the submission to the console (dev-mode fallback) and show a success toast without actually submitting.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Building for Production

```bash
npm run build
```

This runs `next build` and generates a static export in the `out/` directory.

### Verify the output

```bash
# Serve the static output locally
npx serve out

# Check SEO tags are in the raw HTML (no JavaScript needed)
grep "application/ld+json" out/index.html
grep "og:title" out/index.html
```

---

## Deploying the `out/` folder

The `out/` directory contains a fully self-contained static site. Deploy it to any static host:

### Netlify

```bash
# Drag & drop the out/ folder in the Netlify UI, or:
netlify deploy --dir=out --prod
```

### Vercel (static)

```bash
vercel --prebuilt out/
```

### GitHub Pages

```bash
# After building, push out/ to your gh-pages branch
npx gh-pages -d out
```

### AWS S3

```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

### Nginx

```nginx
server {
  listen 80;
  root /var/www/castleacademy/out;
  index index.html;
  location / {
    try_files $uri $uri.html $uri/ =404;
  }
}
```

---

## Setting Environment Variables in Production

For hosted platforms, set `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` as a **build-time** environment variable (not a runtime secret — it is embedded in the JS bundle):

| Platform | How to set |
|---|---|
| Netlify | Site settings → Environment variables |
| Vercel | Project settings → Environment variables |
| GitHub Actions | Repository secrets + `env:` in workflow YAML |
| Custom CI | Export before `npm run build` |

---

## Project Structure

```
castleacademy/
├── app/
│   ├── globals.css       # Tailwind v4 design tokens + brand palette
│   ├── layout.tsx        # Root layout (metadata, fonts, Toaster)
│   └── page.tsx          # Landing page (JSON-LD + all sections)
├── components/
│   ├── ui/               # shadcn/ui components (Radix primitives)
│   ├── logo.tsx
│   ├── nav.tsx           # 'use client' — sticky nav + mobile menu
│   ├── hero.tsx
│   ├── why.tsx
│   ├── perfect-for.tsx
│   ├── pricing.tsx
│   ├── how.tsx
│   ├── gallery.tsx       # 'use client' — Embla carousel
│   ├── booking.tsx       # 'use client' — form + Google Script fetch
│   ├── testimonials.tsx  # 'use client' — quote switcher
│   ├── location.tsx
│   ├── assistance.tsx
│   ├── final-cta.tsx
│   └── footer.tsx
├── lib/
│   └── utils.ts          # cn() utility
├── public/
│   ├── logo.png          # Castle Academy wordmark
│   ├── favicon.ico
│   └── images/           # All JPG assets (gallery, hero, use-cases)
├── next.config.ts        # output: 'export', distDir: 'out'
├── postcss.config.js     # @tailwindcss/postcss
└── tsconfig.next.json    # TypeScript config for Next.js
```

---

## Google Apps Script Setup

1. Create a new Google Apps Script project at [script.google.com](https://script.google.com)
2. Add a `doPost(e)` function to handle the JSON payload
3. Deploy as a **Web App** (Execute as: Me, Who has access: Anyone)
4. Copy the deployment URL into `.env.local`

The booking form POSTs JSON with the following fields:
- `fullName`, `organisation`, `phone`, `email`
- `eventType`, `date` (YYYY-MM-DD), `startTime`, `endTime`
- `participants`, `requirements`
