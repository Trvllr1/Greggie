-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 021: Per-seller Stripe sub-payments for marketplace orders
-- ================================================================
--
-- A marketplace cart can contain items from multiple sellers. Stripe's
-- destination-charge model only routes to one connected account per
-- PaymentIntent, so multi-seller carts need N PIs (one per seller).
--
-- This table tracks each sub-payment: which seller it pays, how much
-- the customer is charged on it, how much the platform takes as
-- application_fee, the resulting Stripe PI ID, and its status.
--
-- Single-seller orders (InitCheckout) also write here going forward so
-- the webhook has one unified dispatch path.

BEGIN;

CREATE TABLE order_payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_id            TEXT NOT NULL,
    program_type         TEXT NOT NULL CHECK (program_type IN ('msp','csp')),
    -- Customer-facing total for this seller's portion (items + allocated shipping/tax − allocated discount)
    customer_cents       BIGINT NOT NULL CHECK (customer_cents >= 0),
    -- Seller item gross (sum of price * qty for this seller's items) — basis for commission
    gross_cents          BIGINT NOT NULL CHECK (gross_cents >= 0),
    -- Stripe application_fee_amount = gross_cents * commission_pct
    fee_cents            BIGINT NOT NULL CHECK (fee_cents >= 0),
    stripe_account_id    TEXT NOT NULL DEFAULT '',
    stripe_payment_id    TEXT NOT NULL DEFAULT '',
    stripe_client_secret TEXT NOT NULL DEFAULT '',
    status               TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','succeeded','failed','canceled')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, seller_id, program_type)
);

CREATE INDEX idx_order_payments_order      ON order_payments(order_id);
CREATE INDEX idx_order_payments_stripe_pi  ON order_payments(stripe_payment_id) WHERE stripe_payment_id <> '';
CREATE INDEX idx_order_payments_seller     ON order_payments(seller_id, program_type);

COMMIT;
