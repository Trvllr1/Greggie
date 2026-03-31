-- ================================================================
-- Greggie™ — Migration 009: Enhanced Checkout Flow
-- Shipping addresses, shipping methods, tax, marketplace-ready orders
-- ================================================================
BEGIN;

-- ── Make channel_id nullable for marketplace orders ──
ALTER TABLE orders ALTER COLUMN channel_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN channel_id SET DEFAULT NULL;

-- ── Shipping addresses (reusable, per-user) ──
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT DEFAULT '',
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  zip_code      TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'US',
  phone         TEXT DEFAULT '',
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_addr_user ON shipping_addresses(user_id);

-- ── Add checkout columns to orders ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES shipping_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT DEFAULT 'standard';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cents BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_cents BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- ── Drop the old status check and add 'failed' ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','failed'));

-- Trigger for updated_at on shipping_addresses
CREATE OR REPLACE TRIGGER trg_shipping_addr_updated
  BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
