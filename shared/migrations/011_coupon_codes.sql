BEGIN;

-- Coupon / promo code table
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  BIGINT NOT NULL CHECK (discount_value > 0),
  min_order_cents BIGINT NOT NULL DEFAULT 0,
  max_uses        INT,            -- NULL = unlimited
  current_uses    INT NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,    -- NULL = never expires
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons (code);

-- Add discount columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents BIGINT NOT NULL DEFAULT 0;

-- Seed some launch promo codes
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_cents, max_uses, expires_at) VALUES
  ('WELCOME10',  'Welcome 10% off',         'percent', 10,    0,     NULL, '2027-01-01'::timestamptz),
  ('GREGGIE20',  'Greggie launch 20% off',  'percent', 20,    5000,  100,  '2026-06-30'::timestamptz),
  ('FLAT5',      '$5 off any order',         'fixed',   500,   1000,  NULL, '2027-01-01'::timestamptz),
  ('SHIP4FREE',  'Free standard shipping',   'fixed',   599,   2000,  200,  '2026-12-31'::timestamptz),
  ('SUMMER25',   'Summer sale 25% off',      'percent', 25,    10000, 50,   '2026-09-01'::timestamptz);

COMMIT;
