-- Castle Academy — Migration 005
-- Adds: admin roles (RBAC), customer accounts, booking↔customer link,
--       reschedule-request workflow, an "expired" booking status,
--       and fixes the payment_status CHECK to match webhook values.
-- Run: psql $DATABASE_URL -f lib/migrations/005_rbac_customers_reschedule.sql
--   or: node lib/run_migration_005.mjs

-- ============================================================
-- 1. Admin roles — owner vs admin
-- ============================================================
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('owner', 'admin'));

-- Promote the default account to owner (full access)
UPDATE admins SET role = 'owner' WHERE username = 'castacadmin';

-- ============================================================
-- 2. Customers — self-service account holders
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,        -- always stored lower-cased by the app
  phone         TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- Link bookings to a customer account (nullable — guest bookings still allowed)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON bookings (customer_id) WHERE customer_id IS NOT NULL;

-- Fast lookup of a customer's bookings by email (guest bookings pre-account)
CREATE INDEX IF NOT EXISTS idx_bookings_email_lower
  ON bookings (LOWER(email));

-- ============================================================
-- 3. Add "expired" status for stale unpaid pending bookings
-- ============================================================
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired'));

-- ============================================================
-- 4. Fix payment_status CHECK — the Nomba webhook writes
--    'failed' and 'reversed', which the original 003 constraint
--    rejected. Widen it so those updates succeed.
-- ============================================================
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed', 'reversed'));

-- ============================================================
-- 5. Reschedule-request workflow
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reschedule_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reschedule_status IN ('none', 'requested', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reschedule_date        DATE,
  ADD COLUMN IF NOT EXISTS reschedule_start_time  TIME,
  ADD COLUMN IF NOT EXISTS reschedule_end_time    TIME,
  ADD COLUMN IF NOT EXISTS reschedule_reason      TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ;

-- ============================================================
-- 6. Invoice number (human-friendly, stable per booking)
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Backfill invoice numbers for existing rows from their reference
UPDATE bookings
  SET invoice_number = 'INV-' || SUBSTRING(reference FROM 4)
  WHERE invoice_number IS NULL;
