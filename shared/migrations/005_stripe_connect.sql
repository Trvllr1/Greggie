-- Migration 005: Stripe Connect integration
-- Adds Stripe-related columns for Connect accounts and payment tracking

-- ── Users: Stripe Connect account ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- ── Orders: Payment tracking ──
-- stripe_payment_id may already exist; ensure idempotency_key and platform_fee
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='idempotency_key') THEN
    ALTER TABLE orders ADD COLUMN idempotency_key TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='platform_fee_cents') THEN
    ALTER TABLE orders ADD COLUMN platform_fee_cents INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='stripe_client_secret') THEN
    ALTER TABLE orders ADD COLUMN stripe_client_secret TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='seller_id') THEN
    ALTER TABLE orders ADD COLUMN seller_id UUID REFERENCES users(id);
  END IF;
END $$;

-- Index for idempotency lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key != '';

-- Index for webhook lookups by payment intent ID
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment ON orders(stripe_payment_id) WHERE stripe_payment_id != '';
