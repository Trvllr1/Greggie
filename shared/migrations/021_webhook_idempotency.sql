-- 021_webhook_idempotency.sql
-- Stripe (and other) webhook event dedup to prevent double-processing on redelivery.
-- Stripe sends duplicate events on retry/network issues; without dedup we double-charge
-- emails, double-fulfill orders, etc.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id      TEXT PRIMARY KEY,
    source        TEXT NOT NULL DEFAULT 'stripe',
    event_type    TEXT,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
    ON processed_webhook_events (processed_at);
