-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 002: Seed Data (dev/demo channels + products)
-- ================================================================

BEGIN;

-- ── Demo Creator ──
INSERT INTO users (id, username, display_name, email, password_hash, role, onboarding_complete)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'greggie_demo', 'Greggie Demo', 'demo@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000002', 'tech_sarah', 'Sarah Chen', 'sarah@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000003', 'fashion_maya', 'Maya Rodriguez', 'maya@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000004', 'viewer_dev', 'Dev User', 'dev@greggie.app', '$2a$10$placeholder', 'viewer', true);

-- ── Demo Wallets ──
INSERT INTO wallets (user_id, balance_cents)
VALUES
    ('00000000-0000-0000-0000-000000000004', 50000);

-- ── Demo Channels ──
INSERT INTO channels (id, creator_id, title, description, category, status, viewer_count, sale_type, thumbnail_url) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Greggie Launch Party', 'The first ever Greggie live sale!', 'Tech', 'LIVE', 1247, 'buy_now', ''),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Tech Drops Daily', 'Daily drops on the hottest tech gadgets', 'Tech', 'LIVE', 892, 'drop', ''),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Runway Ready', 'Live fashion hauls and styling tips', 'Fashion', 'LIVE', 2103, 'buy_now', ''),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Midnight Auctions', 'Rare collectibles up for bid', 'Collectibles', 'SCHEDULED', 0, 'auction', ''),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Beauty Lab', 'Try before you buy — live swatches', 'Beauty', 'RELAY', 341, 'buy_now', ''),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'Street Eats Live', 'Artisanal food drops from local makers', 'Food', 'LIVE', 567, 'drop', '');

-- ── Demo Products ──
INSERT INTO products (id, channel_id, name, description, price_cents, original_price_cents, inventory, sale_type, is_pinned) VALUES
    -- Launch Party products
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Greggie Founder Cap', 'Limited edition launch day cap', 3500, 4500, 100, 'buy_now', true),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Butterfly Pin (Gold)', 'Enamel pin — Greggie butterfly logo', 1200, null, 250, 'buy_now', false),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Launch Hoodie', 'Black hoodie with holographic butterfly', 6500, 8000, 50, 'buy_now', false),
    -- Tech Drops
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Wireless Earbuds Pro', 'ANC, 30hr battery, USB-C', 7900, 12900, 30, 'drop', true),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'MagSafe Battery Pack', 'Fast charge, 10000mAh', 3900, 5500, 75, 'drop', false),
    -- Runway Ready
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Silk Scarf — Indigo', 'Hand-dyed silk, limited run', 8500, null, 15, 'buy_now', true),
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Oversized Blazer', 'Structured wool blend', 15900, 22000, 20, 'buy_now', false),
    -- Midnight Auctions
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'Vintage Polaroid SX-70', 'Working condition, 1972', 25000, null, 1, 'auction', true),
    -- Beauty Lab
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Glass Skin Serum', 'Hyaluronic acid + niacinamide', 4200, 5800, 200, 'buy_now', true),
    -- Street Eats
    ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000006', 'Truffle Hot Sauce Box', '4-pack artisanal hot sauces', 3800, null, 60, 'drop', true);

COMMIT;
