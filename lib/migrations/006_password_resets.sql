-- Castle Academy — Migration 006
-- Password-reset tokens for customer accounts.
-- Run: node lib/run_migration_006.mjs
--   or: psql $DATABASE_URL -f lib/migrations/006_password_resets.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash   TEXT PRIMARY KEY,           -- sha256 of the emailed token (raw token never stored)
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_customer ON password_reset_tokens (customer_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires  ON password_reset_tokens (expires_at);
