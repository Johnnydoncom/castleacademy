-- Castle Academy — Migration 003: Nomba Payment Fields
-- Run against Neon database

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS nomba_order_ref TEXT,
  ADD COLUMN IF NOT EXISTS nomba_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Index for payment lookups via order reference
CREATE INDEX IF NOT EXISTS idx_bookings_nomba_order_ref
  ON bookings (nomba_order_ref)
  WHERE nomba_order_ref IS NOT NULL;
