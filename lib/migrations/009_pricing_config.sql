-- 009: pricing configuration
--
-- Rates used to live in `pricing-rules.txt`, which was fed to an LLM as a
-- prompt. That made prices non-deterministic: in testing the model applied the
-- Monday Special to Wednesdays (₦85,000 instead of ₦100,000) and invented
-- discounts on non-consecutive days. Anything computable now lives here as
-- structured values that the deterministic engine reads, and the owner can edit
-- them from the admin dashboard without a deploy.
--
-- Rules that cannot be computed from a booking form — the Friday community
-- rate (no published figure, eligibility unverifiable), loyalty, corporate
-- membership and referral credit (all need customer history or status we do
-- not track) — are kept as customer-facing notes, applied manually.
--
-- Single row, id = 1. JSONB so adding a rule type later needs no migration.

CREATE TABLE IF NOT EXISTS pricing_config (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

INSERT INTO pricing_config (id, config) VALUES (1, '{
  "packages": {
    "hours3": 100000,
    "halfDay": 120000,
    "fullDay": 180000,
    "extraHour": 30000
  },
  "mondaySpecial": {
    "enabled": true,
    "hours3": 85000,
    "windowRate": 160000,
    "windowStart": "10:00",
    "windowEnd": "15:00"
  },
  "tuesdayDeal": {
    "enabled": true,
    "qualifyingHours": 4,
    "freeHours": 1
  },
  "multiDay": [
    { "minDays": 2, "maxDays": 2, "percent": 5 },
    { "minDays": 3, "maxDays": 5, "percent": 10 }
  ],
  "earlyBooking": { "enabled": true, "minDaysAhead": 14, "percent": 5 },
  "vatRate": 7.5,
  "extraPrices": {},
  "fridayCommunityNote": "A community rate may apply for NGOs, educational organisations, startups and youth development programmes. Contact us and we will adjust before payment.",
  "manualNotes": [
    "Loyalty: 10% off the 6th booking after 5; a complimentary 3-hour session after 10.",
    "Corporate membership: Silver 5%, Gold 10%, Platinum 15%.",
    "Referral: the referrer earns 5% commission on the booking they refer.",
    "Weekly bookings: custom corporate pricing on request."
  ]
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
