-- ================================================================
-- Greggie™ — Migration 016: Seller Fulfillment Uniqueness
-- Enforce seller-scoped fulfillment and idempotent payouts
-- ================================================================
BEGIN;

-- Keep the most recent payout row for each seller/program/order before adding uniqueness.
WITH ranked_payouts AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, program_type, order_id
           ORDER BY created_at DESC, id DESC
         ) AS row_num
  FROM payouts
)
DELETE FROM payouts p
USING ranked_payouts rp
WHERE p.id = rp.id
  AND rp.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_user_program_order_unique
  ON payouts(user_id, program_type, order_id);

-- Keep the newest fulfillment record for each seller/order pair before enforcing seller scope.
WITH ranked_fulfillment AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY order_id, seller_id
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS row_num
  FROM fulfillment_records
)
DELETE FROM fulfillment_records f
USING ranked_fulfillment rf
WHERE f.id = rf.id
  AND rf.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fulfillment_order_seller_unique
  ON fulfillment_records(order_id, seller_id);

COMMIT;