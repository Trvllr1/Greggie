-- ================================================================
-- Greggie™ — Migration 015: Seller Programs (CSP + MSP)
-- Creator-Seller Program & Marketplace Seller Program
-- ================================================================
BEGIN;

-- ── Seller Programs (enrollment for CSP and MSP) ──
CREATE TABLE seller_programs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  program_type      TEXT NOT NULL CHECK (program_type IN ('csp', 'msp')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','suspended','rejected','closed')),
  tier              TEXT NOT NULL DEFAULT 'new' CHECK (tier IN ('new','rising','established','partner')),
  agreed_at         TIMESTAMPTZ,
  agreement_version TEXT DEFAULT '1.0',
  application_note  TEXT DEFAULT '',
  rejection_reason  TEXT DEFAULT '',
  approved_at       TIMESTAMPTZ,
  activated_at      TIMESTAMPTZ,
  suspended_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_seller_programs_user_type ON seller_programs(user_id, program_type);
CREATE INDEX idx_seller_programs_status ON seller_programs(status);
CREATE INDEX idx_seller_programs_type ON seller_programs(program_type);

CREATE TRIGGER trg_seller_programs_updated BEFORE UPDATE ON seller_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Commission Rules (fee structure per program + tier) ──
CREATE TABLE commission_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type      TEXT NOT NULL CHECK (program_type IN ('csp', 'msp')),
  tier              TEXT NOT NULL CHECK (tier IN ('new','rising','established','partner')),
  commission_pct    NUMERIC(5,2) NOT NULL,
  listing_fee_cents BIGINT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_commission_rules_active ON commission_rules(program_type, tier) WHERE is_active = TRUE;

-- Seed CSP commission rates
INSERT INTO commission_rules (program_type, tier, commission_pct) VALUES
  ('csp', 'new',         20.00),
  ('csp', 'rising',      15.00),
  ('csp', 'established', 12.00),
  ('csp', 'partner',     10.00);

-- Seed MSP commission rates
INSERT INTO commission_rules (program_type, tier, commission_pct, listing_fee_cents) VALUES
  ('msp', 'new',         15.00, 0),
  ('msp', 'rising',      12.00, 0),
  ('msp', 'established', 10.00, 0),
  ('msp', 'partner',      8.00, 0);

-- ── Payouts (per-order payout tracking) ──
CREATE TABLE payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  program_type      TEXT NOT NULL CHECK (program_type IN ('csp', 'msp')),
  order_id          UUID NOT NULL REFERENCES orders(id),
  gross_cents       BIGINT NOT NULL,
  commission_cents  BIGINT NOT NULL,
  net_cents         BIGINT NOT NULL,
  payout_status     TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending','processing','paid','failed')),
  stripe_transfer_id TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payouts_user ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(payout_status);
CREATE INDEX idx_payouts_order ON payouts(order_id);
CREATE INDEX idx_payouts_program ON payouts(user_id, program_type);

-- ── Seller Analytics Daily (aggregated metrics per seller per day) ──
CREATE TABLE seller_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  program_type    TEXT NOT NULL,
  date            DATE NOT NULL,
  revenue_cents   BIGINT DEFAULT 0,
  orders_count    INT DEFAULT 0,
  units_sold      INT DEFAULT 0,
  views           INT DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_seller_analytics_daily_unique ON seller_analytics_daily(user_id, program_type, date);

-- ── Fulfillment Records (order fulfillment tracking) ──
CREATE TABLE fulfillment_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id),
  seller_id        UUID NOT NULL REFERENCES users(id),
  fulfillment_type TEXT NOT NULL DEFAULT 'fbm' CHECK (fulfillment_type IN ('fbm', 'fbg')),
  tracking_number  TEXT DEFAULT '',
  carrier          TEXT DEFAULT '',
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','in_transit','delivered','returned')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fulfillment_order ON fulfillment_records(order_id);
CREATE INDEX idx_fulfillment_seller ON fulfillment_records(seller_id);
CREATE INDEX idx_fulfillment_status ON fulfillment_records(status);

CREATE TRIGGER trg_fulfillment_updated BEFORE UPDATE ON fulfillment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Stripe Tax: product tax code column ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_code TEXT DEFAULT 'txcd_99999999';

COMMIT;
