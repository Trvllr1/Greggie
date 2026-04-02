-- 014: Seed rich product data for marketplace demo
-- Enriches existing products with variants, shipping, reviews, specs, and bullet points.
-- Run AFTER 013_rich_product_data.sql

BEGIN;

-- ── Update existing products with rich fields ─────────────────

-- Grab up to 6 existing product IDs to enrich
DO $$
DECLARE
    p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;
    vg_color UUID; vg_size UUID; vg_storage UUID;
    vo_black UUID; vo_white UUID; vo_navy UUID;
    vo_sm UUID; vo_md UUID; vo_lg UUID; vo_xl UUID;
    vo_128 UUID; vo_256 UUID;
    var1 UUID; var2 UUID; var3 UUID; var4 UUID;
    bundle1 UUID;
BEGIN
    -- Get product IDs (will gracefully skip if fewer exist)
    SELECT id INTO p1 FROM products ORDER BY id LIMIT 1 OFFSET 0;
    SELECT id INTO p2 FROM products ORDER BY id LIMIT 1 OFFSET 1;
    SELECT id INTO p3 FROM products ORDER BY id LIMIT 1 OFFSET 2;
    SELECT id INTO p4 FROM products ORDER BY id LIMIT 1 OFFSET 3;
    SELECT id INTO p5 FROM products ORDER BY id LIMIT 1 OFFSET 4;
    SELECT id INTO p6 FROM products ORDER BY id LIMIT 1 OFFSET 5;

    IF p1 IS NULL THEN RETURN; END IF;

    -- ── Enrich Product 1 (main showcase) ──────────────────────

    UPDATE products SET
        category = 'Electronics',
        subcategory = 'Wireless Audio',
        brand = 'SoundVibe',
        condition = 'new',
        return_days = 30,
        warranty_info = '1-year manufacturer warranty',
        bullet_points = ARRAY[
            'Active Noise Cancellation with adaptive transparency mode',
            '40-hour battery life with fast charging (10 min = 3 hours)',
            'Hi-Res Audio certified with LDAC & aptX HD codecs',
            'Comfortable memory foam ear cushions, foldable design',
            'Multipoint connection — pair two devices simultaneously'
        ],
        review_count = 4,
        review_avg = 4.50
    WHERE id = p1;

    -- Variant groups: Color + Size
    INSERT INTO product_variant_groups (id, product_id, name, position) VALUES
        (gen_random_uuid(), p1, 'Color', 0) RETURNING id INTO vg_color;
    INSERT INTO product_variant_groups (id, product_id, name, position) VALUES
        (gen_random_uuid(), p1, 'Cable Length', 1) RETURNING id INTO vg_size;

    INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
        (gen_random_uuid(), vg_color, 'Midnight Black', '#1a1a2e', 0) RETURNING id INTO vo_black;
    INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
        (gen_random_uuid(), vg_color, 'Pearl White', '#f0f0f0', 1) RETURNING id INTO vo_white;
    INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
        (gen_random_uuid(), vg_color, 'Navy Blue', '#1e3a5f', 2) RETURNING id INTO vo_navy;

    INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
        (gen_random_uuid(), vg_size, '3.5mm', '', 0) RETURNING id INTO vo_sm;
    INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
        (gen_random_uuid(), vg_size, 'USB-C', '', 1) RETURNING id INTO vo_md;

    -- Variants
    INSERT INTO product_variants (id, product_id, sku, inventory, is_default) VALUES
        (gen_random_uuid(), p1, 'SV-HP-BLK-35', 25, true) RETURNING id INTO var1;
    INSERT INTO product_variant_option_map (variant_id, option_id) VALUES (var1, vo_black), (var1, vo_sm);

    INSERT INTO product_variants (id, product_id, sku, price_cents, inventory, is_default) VALUES
        (gen_random_uuid(), p1, 'SV-HP-WHT-USBC', 8999, 18, false) RETURNING id INTO var2;
    INSERT INTO product_variant_option_map (variant_id, option_id) VALUES (var2, vo_white), (var2, vo_md);

    INSERT INTO product_variants (id, product_id, sku, inventory, is_default) VALUES
        (gen_random_uuid(), p1, 'SV-HP-NVY-35', 12, false) RETURNING id INTO var3;
    INSERT INTO product_variant_option_map (variant_id, option_id) VALUES (var3, vo_navy), (var3, vo_sm);

    -- Shipping
    INSERT INTO product_shipping (product_id, weight_oz, free_shipping, shipping_class, handling_days, estimated_days_min, estimated_days_max, ships_from_state)
    VALUES (p1, 12.5, true, 'standard', 1, 3, 5, 'CA');

    -- Reviews
    INSERT INTO product_reviews (product_id, user_name, rating, title, body, verified_purchase, helpful_count) VALUES
        (p1, 'AudioPhil23', 5, 'Best headphones under $100', 'The ANC on these is incredible for the price. Battery lasts forever. My daily driver now.', true, 42),
        (p1, 'Sarah M.', 4, 'Great sound, slightly tight fit', 'Sound quality is amazing. A bit snug on larger heads but loosens up after a week. Love the white color.', true, 18),
        (p1, 'DJ_Crate', 5, 'Studio quality for everyday use', 'Been producing music for 10 years. These rival headphones 3x their price. LDAC codec makes a real difference.', true, 31),
        (p1, 'TechReviewer44', 4, 'Solid across the board', 'Good ANC, good battery, good build. Nothing groundbreaking but hits every mark. Recommended.', false, 7);

    -- Specs
    INSERT INTO product_specs (product_id, key, value, position) VALUES
        (p1, 'Driver Size', '40mm dynamic', 0),
        (p1, 'Frequency Response', '20Hz - 40kHz', 1),
        (p1, 'Impedance', '32Ω', 2),
        (p1, 'Battery Life', '40 hours (ANC on)', 3),
        (p1, 'Charging', 'USB-C, Fast Charge', 4),
        (p1, 'Weight', '250g', 5),
        (p1, 'Bluetooth', '5.3 with LDAC, aptX HD', 6),
        (p1, 'Noise Cancellation', 'Hybrid ANC, -35dB', 7);

    -- ── Enrich Product 2 ──────────────────────────────────────

    IF p2 IS NOT NULL THEN
        UPDATE products SET
            category = 'Apparel',
            subcategory = 'Streetwear',
            brand = 'UrbanThread',
            condition = 'new',
            return_days = 14,
            warranty_info = '',
            bullet_points = ARRAY[
                '100% organic cotton, 280gsm heavyweight French terry',
                'Oversized drop-shoulder fit with ribbed cuffs and hem',
                'Embroidered logo on chest and back print',
                'Pre-shrunk and garment-dyed for lived-in feel'
            ],
            review_count = 2,
            review_avg = 4.00
        WHERE id = p2;

        INSERT INTO product_variant_groups (id, product_id, name, position) VALUES
            (gen_random_uuid(), p2, 'Size', 0) RETURNING id INTO vg_size;

        INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
            (gen_random_uuid(), vg_size, 'S', '', 0) RETURNING id INTO vo_sm;
        INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
            (gen_random_uuid(), vg_size, 'M', '', 1) RETURNING id INTO vo_md;
        INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
            (gen_random_uuid(), vg_size, 'L', '', 2) RETURNING id INTO vo_lg;
        INSERT INTO product_variant_options (id, group_id, label, value, position) VALUES
            (gen_random_uuid(), vg_size, 'XL', '', 3) RETURNING id INTO vo_xl;

        INSERT INTO product_variants (product_id, sku, inventory, is_default) VALUES
            (p2, 'UT-CREW-S', 15, false),
            (p2, 'UT-CREW-M', 30, true),
            (p2, 'UT-CREW-L', 25, false),
            (p2, 'UT-CREW-XL', 10, false);

        INSERT INTO product_shipping (product_id, weight_oz, free_shipping, shipping_class, handling_days, estimated_days_min, estimated_days_max, ships_from_state)
        VALUES (p2, 16, false, 'standard', 2, 5, 7, 'NY');

        INSERT INTO product_reviews (product_id, user_name, rating, title, body, verified_purchase) VALUES
            (p2, 'FitCheck_95', 5, 'Perfect heavyweight tee', 'Thick cotton, great drop shoulder. Sizing runs big — go TTS for oversized or size down for fitted.', true),
            (p2, 'MinimalVibes', 3, 'Good quality, wish it had more colors', 'Fabric and stitching are top tier. Would love to see more colorways.', true);

        INSERT INTO product_specs (product_id, key, value, position) VALUES
            (p2, 'Material', '100% Organic Cotton', 0),
            (p2, 'Weight', '280gsm French Terry', 1),
            (p2, 'Fit', 'Oversized / Drop Shoulder', 2),
            (p2, 'Care', 'Machine wash cold, tumble dry low', 3);
    END IF;

    -- ── Enrich Product 3 ──────────────────────────────────────

    IF p3 IS NOT NULL THEN
        UPDATE products SET
            category = 'Home',
            subcategory = 'Smart Lighting',
            brand = 'LumaScape',
            condition = 'new',
            return_days = 30,
            warranty_info = '2-year warranty',
            is_digital = false,
            bullet_points = ARRAY[
                '16 million colors + tunable white (2200K-6500K)',
                'Works with Alexa, Google Home, and Apple HomeKit',
                'Music sync mode — reacts to beats in real time',
                'Install in under 5 minutes, no hub required'
            ],
            review_count = 3,
            review_avg = 4.33
        WHERE id = p3;

        INSERT INTO product_shipping (product_id, weight_oz, free_shipping, shipping_class, handling_days, estimated_days_min, estimated_days_max, ships_from_state)
        VALUES (p3, 8, true, 'standard', 1, 2, 4, 'TX');

        INSERT INTO product_reviews (product_id, user_name, rating, title, body, verified_purchase, helpful_count) VALUES
            (p3, 'SmartHomeFan', 5, 'Best smart bulb I have owned', 'Setup took 2 minutes. Colors are vivid. HomeKit integration is flawless.', true, 14),
            (p3, 'RoomGlow', 4, 'Great ambiance', 'Perfect for my streaming setup. Music sync is fun but can be laggy over Bluetooth.', true, 6),
            (p3, 'NightOwl22', 4, 'Solid for the price', 'Nice range of whites. Wish the app was better but it gets the job done.', false, 3);

        INSERT INTO product_specs (product_id, key, value, position) VALUES
            (p3, 'Wattage', '9W (60W equivalent)', 0),
            (p3, 'Lumens', '800lm', 1),
            (p3, 'Color Range', '16M colors + 2200K-6500K white', 2),
            (p3, 'Connectivity', 'Wi-Fi 2.4GHz, Bluetooth 5.0', 3),
            (p3, 'Base', 'E26 / A19', 4),
            (p3, 'Lifespan', '25,000 hours', 5);
    END IF;

    -- ── Set up product relations ──────────────────────────────

    IF p1 IS NOT NULL AND p2 IS NOT NULL THEN
        INSERT INTO product_relations (product_id, related_id, relation_type, position) VALUES
            (p1, p2, 'related', 0);
    END IF;
    IF p1 IS NOT NULL AND p3 IS NOT NULL THEN
        INSERT INTO product_relations (product_id, related_id, relation_type, position) VALUES
            (p1, p3, 'related', 1);
    END IF;
    IF p2 IS NOT NULL AND p1 IS NOT NULL THEN
        INSERT INTO product_relations (product_id, related_id, relation_type, position) VALUES
            (p2, p1, 'frequently_bought', 0);
    END IF;

    -- ── Create a bundle if we have 2+ products ───────────────

    IF p1 IS NOT NULL AND p3 IS NOT NULL THEN
        INSERT INTO product_bundles (id, name, description, discount_pct) VALUES
            (gen_random_uuid(), 'Sound + Light Setup', 'Premium headphones paired with smart lighting for the ultimate vibe.', 15)
        RETURNING id INTO bundle1;

        INSERT INTO product_bundle_items (bundle_id, product_id, quantity, position) VALUES
            (bundle1, p1, 1, 0),
            (bundle1, p3, 2, 1);
    END IF;

END $$;

COMMIT;
