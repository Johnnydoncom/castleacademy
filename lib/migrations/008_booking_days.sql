-- 008: per-day scheduling
--
-- Until now a booking carried ONE start_time/end_time applied to every day in
-- its range. A two-day programme running 10:00–14:00 then 10:00–15:00 could not
-- be expressed: the customer had to book 10:00–15:00 twice, paying for an hour
-- they did not use and blocking the room from everyone else for that hour. It
-- also made pricing wrong, since the whole range was billed at one day's tier.
--
-- `booking_days` is now the source of truth for scheduling: one row per day,
-- each with its own hours. Days need not be consecutive, so "every Tuesday for
-- four weeks" is a single booking.
--
-- The four columns on `bookings` are KEPT as a derived summary (earliest date,
-- latest date, earliest start, latest end) so every existing read path — admin
-- tables, dashboard, emails, invoices, the payment webhook, the customer
-- portal — keeps working unchanged. Write paths maintain them; nothing should
-- schedule from them.

CREATE TABLE IF NOT EXISTS booking_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  day_date    DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_days_time_order CHECK (end_time > start_time),
  CONSTRAINT booking_days_unique_day UNIQUE (booking_id, day_date)
);

-- Availability and conflict checks scan by date, then by time.
CREATE INDEX IF NOT EXISTS idx_booking_days_date ON booking_days (day_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_booking_days_booking ON booking_days (booking_id);

-- ============================================================
-- Backfill: expand every existing booking's range into day rows.
-- Idempotent — only inserts for bookings that have no days yet.
--
-- Bookings whose end_time is not after start_time are SKIPPED. Four such rows
-- exist (all expired/unpaid, e.g. 10:30–03:30), created before end-after-start
-- validation was enforced — an AM/PM mistake the old form allowed through.
-- They cannot be expressed as a valid day row and, being expired, block
-- nothing. Their summary columns are left untouched so they still display.
-- Run lib/inspect_bad_times.mjs to list them.
-- ============================================================
INSERT INTO booking_days (booking_id, day_date, start_time, end_time)
SELECT b.id, d::date, b.start_time, b.end_time
FROM bookings b
CROSS JOIN LATERAL generate_series(b.start_date, b.end_date, INTERVAL '1 day') AS d
WHERE b.end_time > b.start_time
  AND NOT EXISTS (SELECT 1 FROM booking_days bd WHERE bd.booking_id = b.id)
ON CONFLICT (booking_id, day_date) DO NOTHING;

-- ============================================================
-- venue_settings: small key/value store for operational knobs that the owner
-- can change without a deploy. First use is the turnaround buffer between two
-- different bookings on the same day (time to reset the room).
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO venue_settings (key, value) VALUES ('turnaround_minutes', '30')
ON CONFLICT (key) DO NOTHING;
