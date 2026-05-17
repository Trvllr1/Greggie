-- ================================================================
-- Greggie™ — Migration 022: Facebook-style Marketplace MVP
-- - Location columns on shops + products (denormalized) for Near-me
-- - saved_products table (wishlist / favorites)
-- - Index for chronological "Just Posted" feed
-- ================================================================

BEGIN;

-- ── Location fields on shops (seller's home base) ──
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_zip   TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_city  TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_state TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_lat   NUMERIC(10,7);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_lng   NUMERIC(10,7);

-- ── Location fields on products (denormalized for search performance) ──
-- Copied from the owning shop at listing time; can be overridden per-listing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_zip TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10,7);
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_lng NUMERIC(10,7);

-- Chronological feed index — partial, active listings only.
CREATE INDEX IF NOT EXISTS idx_products_recent_active
    ON products (created_at DESC)
    WHERE listing_status = 'active';

-- Bounding-box index for Near-me (MVP: btree composite; PostGIS deferred).
CREATE INDEX IF NOT EXISTS idx_products_location
    ON products (location_lat, location_lng)
    WHERE listing_status = 'active' AND location_lat IS NOT NULL;

-- ── Saved products (wishlist / favorites) ──
CREATE TABLE IF NOT EXISTS saved_products (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_products_user
    ON saved_products (user_id, created_at DESC);

COMMIT;
