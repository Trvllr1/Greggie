-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 002: Seed Data (dev/demo — 20 channels + products)
-- ================================================================

BEGIN;

-- ── Demo Creators ──
INSERT INTO users (id, username, display_name, email, password_hash, role, onboarding_complete)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'greggie_demo', 'Greggie Demo', 'demo@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000002', 'tech_sarah', 'Sarah Chen', 'sarah@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000003', 'fashion_maya', 'Maya Rodriguez', 'maya@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000004', 'viewer_dev', 'Dev User', 'dev@greggie.app', '$2a$10$placeholder', 'viewer', true),
    ('00000000-0000-0000-0000-000000000005', 'beauty_glowup', 'GlowUp Cosmetics', 'glowup@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000006', 'chef_mario', 'Chef Mario', 'mario@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000007', 'elena_arts', 'Elena Arts', 'elena@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000008', 'sneakerheadz', 'SneakerHeadz', 'sneakers@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000009', 'timepiece_vault', 'Timepiece Vault', 'watches@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000010', 'fitlife', 'FitLife', 'fit@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000011', 'auto_classics', 'Auto Classics', 'auto@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000012', 'seoul_station', 'Seoul Station', 'seoul@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000013', 'zen_spaces', 'Zen Spaces', 'zen@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000014', 'bark_avenue', 'Bark Avenue', 'bark@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000015', 'nomad_supply', 'Nomad Supply', 'nomad@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000016', 'sole_artist', 'Sole Artist', 'sole@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000017', 'antiquarian', 'Antiquarian Books', 'books@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000018', 'botany_bay', 'Botany Bay', 'plants@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000019', 'pixel_studios', 'Pixel Studios', 'pixel@greggie.app', '$2a$10$placeholder', 'creator', true),
    ('00000000-0000-0000-0000-000000000020', 'spin_records', 'Spin Records', 'vinyl@greggie.app', '$2a$10$placeholder', 'creator', true)
ON CONFLICT (id) DO NOTHING;

-- ── Demo Wallets ──
INSERT INTO wallets (user_id, balance_cents)
VALUES
    ('00000000-0000-0000-0000-000000000004', 50000)
ON CONFLICT (user_id) DO NOTHING;

-- ── 20 Channels (with badge + is_primary) ──
INSERT INTO channels (id, creator_id, title, description, category, status, viewer_count, sale_type, badge, is_primary, thumbnail_url, stream_url) VALUES
    -- c1: Primary — Samsung Galaxy Unpacked (EXCLUSIVE)
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Samsung Galaxy Unpacked', 'Major sponsored launch event — exclusive drops and reveals', 'Tech', 'LIVE', 128000, 'buy_now', 'EXCLUSIVE', true,
     'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&q=80&w=1200&h=600',
     'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&q=80&w=1200&h=600'),

    -- c2: NYC Boutique Drop (FLASH)
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'NYC Boutique Drop', 'Live fashion hauls and styling tips', 'Fashion', 'LIVE', 3200, 'buy_now', 'FLASH', false,
     'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c3: Vintage Card Breaks (REPLAY)
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Vintage Card Breaks', 'Rare collectibles up for bid', 'Collectibles', 'RELAY', 850, 'auction', 'REPLAY', false,
     'https://images.unsplash.com/photo-1626197031507-c17099753214?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1626197031507-c17099753214?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c4: GlowUp Summer Collection (TRENDING)
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'GlowUp Summer Collection', 'Try before you buy — live swatches and drops', 'Beauty', 'LIVE', 28500, 'drop', 'TRENDING', false,
     'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c5: Chef Mario Cooks Live
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 'Chef Mario Cooks Live', 'Artisanal food drops from local makers', 'Food', 'LIVE', 5400, 'drop', '', false,
     'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c6: Live Canvas: Abstract Series (ART)
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'Live Canvas: Abstract Series', 'Original paintings created live on stream', 'Art', 'LIVE', 1200, 'auction', 'ART', false,
     'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c7: SneakerHeadz: Rare Jordan Drop (HYPE)
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'SneakerHeadz: Rare Jordan Drop', 'Deadstock heat — first come first served', 'Fashion', 'LIVE', 45000, 'drop', 'HYPE', false,
     'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c8: Luxe Watches Vault (LUXURY)
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009', 'Luxe Watches Vault', 'Authenticated luxury timepieces live', 'Luxury', 'LIVE', 8900, 'auction', 'LUXURY', false,
     'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c9: Iron & Yoga Essentials (RELAY)
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Iron & Yoga Essentials', 'Fitness gear reviews and live demos', 'Fitness', 'RELAY', 450, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c10: Classic Car Auctions (PREMIUM)
    ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', 'Classic Car Auctions', 'Fully restored classics, live bidding', 'Automotive', 'LIVE', 12400, 'auction', 'PREMIUM', false,
     'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c11: TechReview: Unboxing the Future
    ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'TechReview: Unboxing the Future', 'Daily drops on the hottest tech gadgets', 'Tech', 'LIVE', 18500, 'drop', '', false,
     'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c12: K-Pop Merch Exclusive (GLOBAL)
    ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'K-Pop Merch Exclusive', 'Signed albums and limited lightstick bundles', 'Collectibles', 'LIVE', 52000, 'buy_now', 'GLOBAL', false,
     'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c13: Minimalist Home Decor (SCHEDULED)
    ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', 'Minimalist Home Decor', 'Hand-poured candles, ceramics, and more', 'Home', 'SCHEDULED', 0, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c14: Spoiled Pups Boutique
    ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', 'Spoiled Pups Boutique', 'Designer pet accessories live', 'Pets', 'LIVE', 6700, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c15: Adventure Awaits: Travel Gear (RELAY)
    ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000015', 'Adventure Awaits: Travel Gear', 'Ultralight backpacks and adventure essentials', 'Travel', 'RELAY', 1100, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c16: Custom Kicks Live (CREATIVE)
    ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000016', 'Custom Kicks Live', 'Hand-painted sneakers made on stream', 'Art', 'LIVE', 8500, 'auction', 'CREATIVE', false,
     'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c17: Rare Books & Manuscripts
    ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000017', 'Rare Books & Manuscripts', 'First editions and antiquarian treasures', 'Collectibles', 'LIVE', 3200, 'auction', '', false,
     'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c18: Urban Jungle: Rare Plants (DROP)
    ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000018', 'Urban Jungle: Rare Plants', 'Highly sought variegated cuttings — limited stock', 'Home', 'LIVE', 14500, 'drop', 'DROP', false,
     'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c19: Indie Game Showcase
    ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000019', 'Indie Game Showcase', 'Collector editions and digital soundtracks', 'Tech', 'LIVE', 22000, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800&h=600'),

    -- c20: Vintage Vinyl Digging (RELAY)
    ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000020', 'Vintage Vinyl Digging', 'Original pressings in VG+ condition', 'Collectibles', 'RELAY', 2800, 'buy_now', '', false,
     'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&q=80&w=800&h=600',
     'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&q=80&w=800&h=600')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    viewer_count = EXCLUDED.viewer_count,
    sale_type = EXCLUDED.sale_type,
    badge = EXCLUDED.badge,
    is_primary = EXCLUDED.is_primary,
    thumbnail_url = EXCLUDED.thumbnail_url,
    stream_url = EXCLUDED.stream_url;

-- ── Products (1–2 per channel) ──
INSERT INTO products (id, channel_id, name, description, price_cents, original_price_cents, inventory, sale_type, is_pinned, image_url) VALUES
    -- c1: Samsung Galaxy Unpacked
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Watch 7 Ultra', 'The ultimate smartwatch for extreme sports.', 39999, NULL, 42, 'buy_now', true, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Galaxy Buds Pro', 'Immersive sound with active noise cancellation.', 19999, NULL, 150, 'drop', false, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400'),
    -- c2: NYC Boutique Drop
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Leather Crossbody Bag', 'Handcrafted Italian leather bag.', 24900, NULL, 5, 'buy_now', true, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400'),
    -- c3: Vintage Card Breaks
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Holo Charizard 1st Ed', 'PSA 9 Mint Condition.', 150000, NULL, 1, 'auction', true, 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&q=80&w=400'),
    -- c4: GlowUp Summer Collection
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Sunset Eyeshadow Palette', '12 highly pigmented warm shades.', 4500, NULL, 500, 'drop', true, 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?auto=format&fit=crop&q=80&w=400'),
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'Hydrating Lip Oil', 'Non-sticky, high-shine finish.', 1800, NULL, 1200, 'buy_now', false, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=400'),
    -- c5: Chef Mario Cooks Live
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'Pro Chef Knife Set', 'Japanese steel, perfectly balanced.', 29999, NULL, 20, 'buy_now', true, 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=400'),
    -- c6: Live Canvas: Abstract Series
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000006', 'Midnight Ocean (Original)', 'Acrylic on canvas, 24x36 inches.', 50000, NULL, 1, 'auction', true, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=400'),
    -- c7: SneakerHeadz
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', 'Air Jordan 1 Retro High', 'Chicago colorway, deadstock.', 17000, NULL, 10, 'drop', true, 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&q=80&w=400'),
    -- c8: Luxe Watches Vault
    ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000008', 'Rolex Submariner Date', 'Mint condition, box and papers included.', 1200000, NULL, 1, 'auction', true, 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=400'),
    -- c9: Iron & Yoga Essentials
    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000009', 'Premium Yoga Mat', 'Eco-friendly, non-slip surface.', 6500, NULL, 200, 'buy_now', true, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=400'),
    -- c10: Classic Car Auctions
    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000010', '1967 Ford Mustang Shelby GT500', 'Fully restored, matching numbers.', 15000000, NULL, 1, 'auction', true, 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=400'),
    -- c11: TechReview
    ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000011', 'Quantum VR Headset', 'Next-gen virtual reality experience.', 49900, NULL, 300, 'drop', true, 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=400'),
    -- c12: K-Pop Merch
    ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000012', 'Signed Album + Lightstick Bundle', 'Limited edition signed by all members.', 12000, NULL, 50, 'buy_now', true, 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=400'),
    -- c13: Minimalist Home Decor
    ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000013', 'Hand-poured Soy Candle', 'Sandalwood and vanilla scent.', 3500, NULL, 100, 'buy_now', true, 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=400'),
    -- c14: Spoiled Pups
    ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000014', 'Designer Dog Collar', 'Genuine leather with brass hardware.', 8500, NULL, 25, 'buy_now', true, 'https://images.unsplash.com/photo-1602584386319-fa8eb4361c2c?auto=format&fit=crop&q=80&w=400'),
    -- c15: Adventure Awaits
    ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000015', 'Ultralight Backpack', 'Waterproof, 40L capacity.', 15000, NULL, 80, 'buy_now', true, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400'),
    -- c16: Custom Kicks Live
    ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000016', 'Custom Painted AF1s', 'Hand-painted galaxy design.', 25000, NULL, 2, 'auction', true, 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&q=80&w=400'),
    -- c17: Rare Books
    ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000017', '1st Edition Great Gatsby', 'Original dust jacket, excellent condition.', 450000, NULL, 1, 'auction', true, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'),
    -- c18: Urban Jungle
    ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000018', 'Monstera Albo Variegata', 'Highly sought after variegated cutting.', 35000, NULL, 15, 'drop', true, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400'),
    -- c19: Indie Game Showcase
    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000019', 'Cyberpunk 2077 Collector Edition', 'Includes statue, artbook, and digital soundtrack.', 19999, NULL, 50, 'buy_now', true, 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=400'),
    -- c20: Vintage Vinyl
    ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000020', 'Pink Floyd - Dark Side of the Moon', 'Original 1973 pressing, VG+ condition.', 4500, NULL, 3, 'buy_now', true, 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=400')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    inventory = EXCLUDED.inventory,
    sale_type = EXCLUDED.sale_type,
    image_url = EXCLUDED.image_url;

COMMIT;
