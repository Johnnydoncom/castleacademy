-- Castle Academy — Migration 004: Add payment_method column
-- Run against Neon database:
-- psql $DATABASE_URL -f lib/migrations/004_add_payment_method.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('card', 'bank_transfer', 'manual'));

COMMENT ON COLUMN bookings.payment_method IS
  'How payment was received: card or bank_transfer (via Nomba), or manual (admin-confirmed offline payment)';
