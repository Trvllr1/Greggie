-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 001: Core Schema (Master Design Canvas Section 16)
-- ================================================================

BEGIN;

-- ── Users ──
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    avatar_url      TEXT DEFAULT '',
    role            TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'creator', 'admin')),
    onboarding_complete BOOLEAN DEFAULT FALSE,
    preferred_categories TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ── Wallets ──
CREATE TABLE wallets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_cents BIGINT DEFAULT 0 CHECK (balance_cents >= 0),
    currency    TEXT DEFAULT 'USD',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_wallets_user ON wallets(user_id);

-- ── Channels ──
CREATE TABLE channels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    category        TEXT NOT NULL,
    thumbnail_url   TEXT DEFAULT '',
    stream_url      TEXT DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('LIVE', 'RELAY', 'OFFLINE', 'SCHEDULED')),
    viewer_count    INT DEFAULT 0,
    sale_type       TEXT NOT NULL DEFAULT 'buy_now' CHECK (sale_type IN ('buy_now', 'auction', 'drop')),
    scheduled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_channels_creator ON channels(creator_id);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channels_category ON channels(category);
CREATE INDEX idx_channels_viewers ON channels(viewer_count DESC);

-- ── Products ──
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id          UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    description         TEXT DEFAULT '',
    image_url           TEXT DEFAULT '',
    price_cents         BIGINT NOT NULL CHECK (price_cents >= 0),
    original_price_cents BIGINT,
    inventory           INT NOT NULL DEFAULT 0 CHECK (inventory >= 0),
    sale_type           TEXT NOT NULL DEFAULT 'buy_now' CHECK (sale_type IN ('buy_now', 'auction', 'drop')),
    is_pinned           BOOLEAN DEFAULT FALSE,
    auction_end_at      TIMESTAMPTZ,
    drop_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_channel ON products(channel_id);
CREATE INDEX idx_products_pinned ON products(channel_id) WHERE is_pinned = TRUE;

-- ── Orders ──
CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id        UUID NOT NULL REFERENCES channels(id),
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total_cents       BIGINT NOT NULL CHECK (total_cents >= 0),
    stripe_payment_id TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_channel ON orders(channel_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ── Order Items ──
CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── Checkout Sessions ──
CREATE TABLE checkout_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id        UUID NOT NULL REFERENCES channels(id),
    status            TEXT NOT NULL DEFAULT 'INIT' CHECK (status IN ('INIT', 'PROCESSING', 'SUCCESS', 'FAILED')),
    stripe_session_id TEXT,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_checkout_user ON checkout_sessions(user_id);
CREATE INDEX idx_checkout_status ON checkout_sessions(status);

-- ── Relay Entries (AI replay search) ──
CREATE TABLE relay_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id        UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    transcript_chunk  TEXT NOT NULL,
    timestamp_sec     INT NOT NULL,
    embedding_vector  FLOAT8[],
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_relay_channel ON relay_entries(channel_id);
CREATE INDEX idx_relay_timestamp ON relay_entries(channel_id, timestamp_sec);

-- ── Analytics Events ──
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id  UUID REFERENCES channels(id),
    event_type  TEXT NOT NULL,
    payload     JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_channel ON events(channel_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- ── Follows ──
CREATE TABLE follows (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);
CREATE INDEX idx_follows_channel ON follows(channel_id);

-- ── Updated-at trigger ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_wallets_updated  BEFORE UPDATE ON wallets          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_channels_updated BEFORE UPDATE ON channels         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
