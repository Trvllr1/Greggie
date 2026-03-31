-- 006: Auction engine schema
-- Adds bids table, auction status tracking, and bid-related columns on products.

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_product_amount ON bids(product_id, amount_cents DESC);
CREATE INDEX idx_bids_user           ON bids(user_id);

-- Auction tracking columns on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_status      TEXT DEFAULT 'pending' CHECK (auction_status IN ('pending', 'active', 'ended', 'settled'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_reserve_cents BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_winner_id   UUID REFERENCES users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_bid_cents   BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highest_bidder_id   UUID REFERENCES users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS bid_count           INT DEFAULT 0;

-- Index for the auction scheduler: find active auctions past their end time
CREATE INDEX idx_products_auction_active ON products(auction_end_at) WHERE auction_status = 'active';
