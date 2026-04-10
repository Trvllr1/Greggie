-- ================================================================
-- Greggie™ — Migration 007: Marketplace MVP
-- Shops, product enhancements, carts, full-text search
-- ================================================================
BEGIN;

-- ── Shops ──
CREATE TABLE shops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT DEFAULT '',
  logo_url      TEXT DEFAULT '',
  banner_url    TEXT DEFAULT '',
  return_policy TEXT DEFAULT '30_days',
  shipping_from TEXT DEFAULT '',
  stripe_account_id TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_status ON shops(status);

-- ── Decouple products from channels ──
ALTER TABLE products ADD COLUMN shop_id UUID REFERENCES shops(id);
ALTER TABLE products ALTER COLUMN channel_id DROP NOT NULL;

-- Channel-products join table (channels *feature* products from shops)
CREATE TABLE channel_products (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position   INT DEFAULT 0,
  is_pinned  BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (channel_id, product_id)
);

-- ── Enhanced product listings ──
ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'new' CHECK (condition IN ('new','like_new','good','fair'));
ALTER TABLE products ADD COLUMN listing_status TEXT DEFAULT 'active' CHECK (listing_status IN ('active','draft','sold','archived'));
ALTER TABLE products ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN brand TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN sku TEXT DEFAULT '';

-- Product images (multi-image support)
CREATE TABLE product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- Full-text search vector
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.brand, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_update
  BEFORE INSERT OR UPDATE OF name, description, brand, tags
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_update();

-- Backfill search_vector for existing rows
UPDATE products SET search_vector = to_tsvector('english',
  COALESCE(name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(brand, '') || ' ' ||
  COALESCE(array_to_string(tags, ' '), '')
);

-- ── User role upgrade ──
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'buyer' WHERE role = 'viewer';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('buyer','seller','creator','admin','viewer'));

-- ── Carts ──
CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_carts_user ON carts(user_id);

CREATE TABLE cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, product_id);

-- ── Additional marketplace indexes ──
CREATE INDEX idx_products_shop ON products(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX idx_products_listing_status ON products(listing_status);
CREATE INDEX idx_products_category ON products(sale_type, listing_status);

COMMIT;
