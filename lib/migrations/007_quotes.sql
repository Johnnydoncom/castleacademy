-- 007: quote cache
--
-- `/api/quote` (live pricing while the customer fills the form) and `/api/book`
-- (the charge) must return identical figures. They frequently run on different
-- serverless instances, so an in-process cache is not enough — the quote is
-- stored here, keyed by a content hash of the pricing inputs + the price list +
-- the VAT rate. Same booking details => same id => same numbers.
--
-- Rows expire after 24h: long enough that a customer who leaves the tab open is
-- charged what they were quoted, short enough that a price-list change lands.

CREATE TABLE IF NOT EXISTS quotes (
  id                TEXT PRIMARY KEY,               -- sha256 hex of the pricing input
  input             JSONB        NOT NULL,
  source            TEXT         NOT NULL CHECK (source IN ('ai', 'deterministic')),
  hours             NUMERIC(5,2) NOT NULL,
  days              INTEGER      NOT NULL,
  lines             JSONB        NOT NULL DEFAULT '[]'::jsonb,
  base_subtotal     INTEGER      NOT NULL,
  discount_amount   INTEGER      NOT NULL DEFAULT 0,
  discount_applied  TEXT,
  subtotal          INTEGER      NOT NULL,
  breakdown         TEXT,
  vat_rate          NUMERIC(4,2) NOT NULL,
  vat_amount        INTEGER      NOT NULL,
  total             INTEGER      NOT NULL,
  extras_priced     BOOLEAN      NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ  NOT NULL DEFAULT now() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_quotes_expires ON quotes (expires_at);

-- Which quote a booking was priced from, for support and reconciliation.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_id TEXT;
