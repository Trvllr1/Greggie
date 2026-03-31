-- ================================================================
-- Greggie™ — Migration 008: Marketplace Seed Data
-- Sample shops, products, and images for development
-- ================================================================
BEGIN;

-- Upgrade seed users to sellers
UPDATE users SET role = 'seller' WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- ── Shops ──
INSERT INTO shops (id, owner_id, name, slug, description, logo_url, banner_url, shipping_from, is_verified, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'TechVault', 'techvault', 'Premium electronics and gadgets at competitive prices.',
   'https://picsum.photos/seed/shop1logo/200/200', 'https://picsum.photos/seed/shop1banner/1200/400',
   'New York, NY', TRUE, 'active'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'StyleHouse', 'stylehouse', 'Curated streetwear and vintage fashion finds.',
   'https://picsum.photos/seed/shop2logo/200/200', 'https://picsum.photos/seed/shop2banner/1200/400',
   'Los Angeles, CA', TRUE, 'active'),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'Artisan Collective', 'artisan-collective', 'Handcrafted goods and unique art pieces.',
   'https://picsum.photos/seed/shop3logo/200/200', 'https://picsum.photos/seed/shop3banner/1200/400',
   'Portland, OR', FALSE, 'active');

-- ── Marketplace Products ──
-- TechVault products
INSERT INTO products (id, name, description, price_cents, original_price_cents, inventory, sale_type, image_url, shop_id, condition, listing_status, brand, tags) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Wireless Noise-Cancelling Headphones',
   'Premium over-ear headphones with 40hr battery life and active noise cancellation.',
   14999, 19999, 25, 'buy_now', 'https://picsum.photos/seed/prod01/600/600',
   'a0000000-0000-0000-0000-000000000001', 'new', 'active', 'SoundMax', ARRAY['electronics','audio','headphones']),

  ('b0000000-0000-0000-0000-000000000002', 'Mechanical Gaming Keyboard',
   'RGB backlit mechanical keyboard with Cherry MX switches. Hot-swappable.',
   8999, 12999, 15, 'buy_now', 'https://picsum.photos/seed/prod02/600/600',
   'a0000000-0000-0000-0000-000000000001', 'new', 'active', 'KeyForge', ARRAY['electronics','gaming','keyboard']),

  ('b0000000-0000-0000-0000-000000000003', 'Portable SSD 1TB',
   'Ultra-fast USB-C portable solid state drive. Read speeds up to 1050 MB/s.',
   7499, 9999, 40, 'buy_now', 'https://picsum.photos/seed/prod03/600/600',
   'a0000000-0000-0000-0000-000000000001', 'new', 'active', 'DataBolt', ARRAY['electronics','storage','ssd']),

  ('b0000000-0000-0000-0000-000000000004', 'Smart Watch Series X',
   'Fitness tracker with heart rate monitor, GPS, and 5-day battery.',
   24999, 29999, 10, 'buy_now', 'https://picsum.photos/seed/prod04/600/600',
   'a0000000-0000-0000-0000-000000000001', 'new', 'active', 'WristTech', ARRAY['electronics','wearable','watch']),

  ('b0000000-0000-0000-0000-000000000005', 'Refurbished Tablet Pro 11"',
   'Like-new condition tablet with stylus support. Perfect for digital art.',
   34999, 59999, 5, 'buy_now', 'https://picsum.photos/seed/prod05/600/600',
   'a0000000-0000-0000-0000-000000000001', 'like_new', 'active', 'TabletCo', ARRAY['electronics','tablet','refurbished']);

-- StyleHouse products
INSERT INTO products (id, name, description, price_cents, original_price_cents, inventory, sale_type, image_url, shop_id, condition, listing_status, brand, tags) VALUES
  ('b0000000-0000-0000-0000-000000000006', 'Vintage Denim Jacket',
   'Classic 1990s stonewash denim jacket. Authentic vintage, great condition.',
   6999, 0, 3, 'buy_now', 'https://picsum.photos/seed/prod06/600/600',
   'a0000000-0000-0000-0000-000000000002', 'good', 'active', 'Vintage', ARRAY['fashion','denim','jacket','vintage']),

  ('b0000000-0000-0000-0000-000000000007', 'Limited Edition Sneakers',
   'Exclusive collab sneakers. Brand new in box, size 10.',
   19999, 0, 2, 'auction', 'https://picsum.photos/seed/prod07/600/600',
   'a0000000-0000-0000-0000-000000000002', 'new', 'active', 'KickDrop', ARRAY['fashion','sneakers','limited','collab']),

  ('b0000000-0000-0000-0000-000000000008', 'Oversized Graphic Hoodie',
   'Heavy cotton blend hoodie with original graphic print. Unisex fit.',
   4999, 5999, 20, 'buy_now', 'https://picsum.photos/seed/prod08/600/600',
   'a0000000-0000-0000-0000-000000000002', 'new', 'active', 'StreetWave', ARRAY['fashion','hoodie','streetwear']),

  ('b0000000-0000-0000-0000-000000000009', 'Designer Sunglasses',
   'Polarized UV400 aviator sunglasses. Comes with hard case.',
   8999, 14999, 12, 'buy_now', 'https://picsum.photos/seed/prod09/600/600',
   'a0000000-0000-0000-0000-000000000002', 'new', 'active', 'LuxShade', ARRAY['fashion','sunglasses','accessories']),

  ('b0000000-0000-0000-0000-000000000010', 'Crossbody Leather Bag',
   'Full grain leather crossbody with adjustable strap. Handstitched.',
   12999, 0, 8, 'buy_now', 'https://picsum.photos/seed/prod10/600/600',
   'a0000000-0000-0000-0000-000000000002', 'new', 'active', 'CraftHide', ARRAY['fashion','bag','leather','accessories']);

-- Artisan Collective products
INSERT INTO products (id, name, description, price_cents, original_price_cents, inventory, sale_type, image_url, shop_id, condition, listing_status, brand, tags) VALUES
  ('b0000000-0000-0000-0000-000000000011', 'Hand-Poured Soy Candle Set',
   'Set of 3 artisan soy candles. Scents: lavender, cedar, vanilla.',
   3499, 0, 30, 'buy_now', 'https://picsum.photos/seed/prod11/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', 'WickCraft', ARRAY['home','candles','handmade']),

  ('b0000000-0000-0000-0000-000000000012', 'Ceramic Pour-Over Coffee Set',
   'Stoneware dripper + mug set. Each piece unique due to hand-glazing.',
   5999, 0, 15, 'buy_now', 'https://picsum.photos/seed/prod12/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', 'ClayBrew', ARRAY['home','coffee','ceramic','handmade']),

  ('b0000000-0000-0000-0000-000000000013', 'Original Abstract Painting 18x24',
   'Acrylic on canvas. Bold colors. Signed by artist. One of a kind.',
   29999, 0, 1, 'auction', 'https://picsum.photos/seed/prod13/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', '', ARRAY['art','painting','abstract','original']),

  ('b0000000-0000-0000-0000-000000000014', 'Woven Wall Hanging - Large',
   'Macramé wall hanging in natural cotton. 36" wide.',
   7999, 0, 4, 'buy_now', 'https://picsum.photos/seed/prod14/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', 'KnotStudio', ARRAY['home','decor','macrame','handmade']),

  ('b0000000-0000-0000-0000-000000000015', 'Handbound Leather Journal',
   'A5 leather journal with hand-torn pages. 200 sheets of acid-free paper.',
   4499, 0, 18, 'buy_now', 'https://picsum.photos/seed/prod15/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', 'PageCraft', ARRAY['stationery','journal','leather','handmade']),

  ('b0000000-0000-0000-0000-000000000016', 'Minimalist Silver Ring Set',
   'Set of 3 sterling silver stacking rings. Sizes 6-9 available.',
   3999, 0, 22, 'buy_now', 'https://picsum.photos/seed/prod16/600/600',
   'a0000000-0000-0000-0000-000000000003', 'new', 'active', 'SilverLine', ARRAY['jewelry','rings','silver','minimalist']);

COMMIT;
