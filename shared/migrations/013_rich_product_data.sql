-- 013: Rich product data — variants, shipping, reviews, specs, bundles, related products
-- Brings Greggie marketplace products to Amazon-level depth for MP sellers.

BEGIN;

-- ── Product Variants ──────────────────────────────────────────
-- e.g. "Color: Red, Size: XL" → separate inventory and price per combo
CREATE TABLE product_variant_groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,              -- "Color", "Size", "Storage", "Material"
    position   INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variant_options (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE CASCADE,
    label    TEXT NOT NULL,                -- "Red", "XL", "256GB"
    value    TEXT DEFAULT '',              -- hex color code, image url, or empty
    position INT DEFAULT 0
);

CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             TEXT DEFAULT '',
    price_cents     BIGINT,                -- NULL = use product base price
    inventory       INT DEFAULT 0 CHECK (inventory >= 0),
    image_url       TEXT DEFAULT '',        -- variant-specific image
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Maps a variant to its chosen options (e.g. variant "Red-XL" → option "Red" + option "XL")
CREATE TABLE product_variant_option_map (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_id  UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, option_id)
);

-- ── Shipping Info ─────────────────────────────────────────────
CREATE TABLE product_shipping (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    weight_oz          NUMERIC(10,2),
    length_in          NUMERIC(10,2),
    width_in           NUMERIC(10,2),
    height_in          NUMERIC(10,2),
    shipping_class     TEXT DEFAULT 'standard' CHECK (shipping_class IN ('standard','express','overnight','freight','digital')),
    free_shipping      BOOLEAN DEFAULT FALSE,
    flat_rate_cents    BIGINT,             -- NULL = calculated, else flat rate
    ships_from_country TEXT DEFAULT 'US',
    ships_from_state   TEXT DEFAULT '',
    handling_days      INT DEFAULT 1,      -- business days to prepare
    estimated_days_min INT DEFAULT 3,
    estimated_days_max INT DEFAULT 7,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reviews & Ratings ─────────────────────────────────────────
CREATE TABLE product_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name         TEXT DEFAULT '',
    rating            INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title             TEXT DEFAULT '',
    body              TEXT DEFAULT '',
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count     INT DEFAULT 0,
    images            TEXT[] DEFAULT '{}',  -- review photos
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_rating  ON product_reviews(product_id, rating);

-- Aggregate cache for fast queries
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count   INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_avg     NUMERIC(3,2) DEFAULT 0;

-- ── Product Specifications (key-value) ────────────────────────
CREATE TABLE product_specs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,              -- "Display Size", "Battery Life", "Processor"
    value      TEXT NOT NULL,
    position   INT DEFAULT 0
);

-- ── Product Bundles ───────────────────────────────────────────
CREATE TABLE product_bundles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,             -- "Complete Gaming Setup"
    description     TEXT DEFAULT '',
    discount_pct    NUMERIC(5,2) DEFAULT 0,    -- e.g. 10.00 = 10% off bundle total
    discount_cents  BIGINT DEFAULT 0,          -- flat discount (takes priority if > 0)
    shop_id         UUID REFERENCES shops(id) ON DELETE CASCADE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_bundle_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id  UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INT DEFAULT 1,
    position   INT DEFAULT 0,
    UNIQUE(bundle_id, product_id)
);

-- ── Related Products ──────────────────────────────────────────
-- Seller-curated "frequently bought together" or system-generated
CREATE TABLE product_relations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL DEFAULT 'related' CHECK (relation_type IN ('related','frequently_bought','accessory','upgrade')),
    position        INT DEFAULT 0,
    UNIQUE(product_id, related_id, relation_type)
);

-- ── Additional product columns ────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS category       TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory    TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS return_days    INT DEFAULT 30;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info  TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_oz      NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_digital     BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bullet_points  TEXT[] DEFAULT '{}';  -- key selling points

-- ── Helpful indexes ───────────────────────────────────────────
CREATE INDEX idx_variant_groups_product ON product_variant_groups(product_id);
CREATE INDEX idx_variant_options_group  ON product_variant_options(group_id);
CREATE INDEX idx_variants_product       ON product_variants(product_id);
CREATE INDEX idx_specs_product          ON product_specs(product_id);
CREATE INDEX idx_bundle_items_bundle    ON product_bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_product   ON product_bundle_items(product_id);
CREATE INDEX idx_relations_product      ON product_relations(product_id);
CREATE INDEX idx_shipping_product       ON product_shipping(product_id);

COMMIT;
