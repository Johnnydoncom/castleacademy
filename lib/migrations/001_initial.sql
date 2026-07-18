-- Castle Academy — Initial Database Migration
-- Run this once against your Neon database
-- psql $DATABASE_URL -f lib/migrations/001_initial.sql

-- ============================================================
-- venue_hours: Opening hours per day of week
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_hours (
  day_of_week  SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      BOOLEAN NOT NULL DEFAULT true,
  open_time    TIME NOT NULL DEFAULT '09:00',
  close_time   TIME NOT NULL DEFAULT '18:00',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default schedule: Mon–Fri 09:00–18:00, Sat 09:00–16:00, Sun closed
INSERT INTO venue_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, false, '09:00', '18:00'), -- Sunday
  (1, true,  '09:00', '18:00'), -- Monday
  (2, true,  '09:00', '18:00'), -- Tuesday
  (3, true,  '09:00', '18:00'), -- Wednesday
  (4, true,  '09:00', '18:00'), -- Thursday
  (5, true,  '09:00', '18:00'), -- Friday
  (6, true,  '09:00', '16:00')  -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- ============================================================
-- bookings: All booking records
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         VARCHAR(20) UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  organisation      TEXT,
  phone             TEXT NOT NULL,
  email             TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  participants      SMALLINT NOT NULL,
  extras            TEXT[],
  agreed_to_policy  BOOLEAN NOT NULL DEFAULT false,
  -- pending: soft-locks slot for 6 hours (awaiting offline payment + admin confirmation)
  -- confirmed: permanently blocks slot (admin confirmed payment received)
  -- cancelled: slot freed immediately
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  invoice_subtotal  INTEGER,
  invoice_vat       INTEGER,
  invoice_total     INTEGER,
  discount_applied  TEXT,
  invoice_breakdown TEXT,
  notes             TEXT,  -- internal admin notes
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates
  ON bookings (start_date, end_date, status, created_at);

-- ============================================================
-- blocked_slots: Admin-manually-blocked time ranges
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_slots (slot_date);

-- ============================================================
-- social_links: Configurable social media URLs
-- ============================================================
CREATE TABLE IF NOT EXISTS social_links (
  platform    TEXT PRIMARY KEY,
  url         TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed all supported platforms (empty URLs — hidden until configured)
INSERT INTO social_links (platform, url) VALUES
  ('facebook',  ''),
  ('instagram', ''),
  ('twitter',   ''),
  ('tiktok',    ''),
  ('youtube',   ''),
  ('linkedin',  '')
ON CONFLICT (platform) DO NOTHING;
