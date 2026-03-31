-- ================================================================
-- Greggie™ — Migration 010: Guest Checkout Support
-- Allow unregistered users to place orders
-- ================================================================
BEGIN;

-- ── Make orders.user_id nullable for guest orders ──
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- ── Make shipping_addresses.user_id nullable for guest addresses ──
ALTER TABLE shipping_addresses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE shipping_addresses DROP CONSTRAINT IF EXISTS shipping_addresses_user_id_fkey;
ALTER TABLE shipping_addresses ADD CONSTRAINT shipping_addresses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ── Add guest_email to orders for order lookup without account ──
-- (email column already exists from migration 009, just ensure it's indexable)
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email) WHERE email IS NOT NULL AND email != '';

COMMIT;
