-- ================================================================
-- Greggie™ — Migration 021: Buyer service fee on orders
-- Adds a buyer-side platform service fee captured at checkout.
-- ================================================================
BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS service_fee_cents BIGINT NOT NULL DEFAULT 0;

COMMIT;
