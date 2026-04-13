-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 020: Video-Product linking (direct tagging)
-- ================================================================

BEGIN;

-- ── Video-product join table: creators tag specific products per video ──
CREATE TABLE video_products (
    video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position    INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (video_id, product_id)
);
CREATE INDEX idx_video_products_video ON video_products(video_id);
CREATE INDEX idx_video_products_product ON video_products(product_id);

COMMIT;
