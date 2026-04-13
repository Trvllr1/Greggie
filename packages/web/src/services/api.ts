/**
 * API service — maps backend (snake_case) responses to local view-model types.
 * Falls back gracefully when backend is unavailable.
 */

import type { Channel, Product } from '../data/mockData';

// ── Config ──────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_PREFIX = `${API_BASE}/api/v1`;

// ── Token storage ───────────────────────────────────────
let _token: string | null = localStorage.getItem('greggie_token');

export function setToken(token: string) {
  _token = token;
  localStorage.setItem('greggie_token', token);
}

export function clearToken() {
  _token = null;
  localStorage.removeItem('greggie_token');
}

export function getToken() {
  return _token;
}

// ── Fetch wrapper ───────────────────────────────────────
async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  const res = await fetch(`${API_PREFIX}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `API ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Backend JSON shapes ─────────────────────────────────
interface ApiMerchant {
  name: string;
  avatar: string;
}

interface ApiVariantOption {
  id: string;
  group_id: string;
  label: string;
  value: string;
  position: number;
}

interface ApiVariantGroup {
  id: string;
  product_id: string;
  name: string;
  position: number;
  options: ApiVariantOption[];
}

interface ApiVariant {
  id: string;
  product_id: string;
  sku?: string;
  price_cents?: number;
  inventory: number;
  image_url?: string;
  is_default: boolean;
  option_ids: string[];
}

interface ApiShipping {
  free_shipping: boolean;
  shipping_class: string;
  flat_rate_cents?: number;
  ships_from_country: string;
  ships_from_state?: string;
  handling_days: number;
  estimated_days_min: number;
  estimated_days_max: number;
}

interface ApiReview {
  id: string;
  user_name?: string;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean;
  helpful_count: number;
  images?: string[];
  created_at: string;
}

interface ApiSpec {
  key: string;
  value: string;
}

interface ApiBundleItem {
  product?: ApiProduct;
  quantity: number;
}

interface ApiBundle {
  id: string;
  name: string;
  description: string;
  discount_pct: number;
  discount_cents: number;
  items: ApiBundleItem[];
}

interface ApiProduct {
  id: string;
  channel_id: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  original_price_cents?: number;
  inventory: number;
  sale_type: string;
  is_pinned: boolean;
  auction_end_at?: string;
  drop_at?: string;
  current_bid_cents?: number;
  highest_bidder_id?: string;
  auction_status?: string;
  auction_reserve_cents?: number;
  auction_winner_id?: string;
  bid_count?: number;
  created_at: string;
  // Rich product fields
  brand?: string;
  condition?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  images?: { id: string; product_id: string; url: string; position: number }[];
  bullet_points?: string[];
  return_days?: number;
  warranty_info?: string;
  is_digital?: boolean;
  review_count?: number;
  review_avg?: number;
  variant_groups?: ApiVariantGroup[];
  variants?: ApiVariant[];
  specs?: ApiSpec[];
  shipping?: ApiShipping;
  reviews?: ApiReview[];
  related_products?: ApiProduct[];
  bundles?: ApiBundle[];
}

interface ApiChannel {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  stream_url: string;
  stream_key?: string;
  status: string;
  viewer_count: number;
  sale_type: string;
  is_primary: boolean;
  badge?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  merchant?: ApiMerchant;
  products?: ApiProduct[];
}

interface ApiAuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string;
    role: string;
  };
}

// ── Mappers  (backend → view-model) ─────────────────────
function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    price: p.price_cents / 100,
    inventory: p.inventory,
    mediaUrl: p.image_url,
    description: p.description,
    saleType: p.sale_type as Product['saleType'],
    currentBid: p.current_bid_cents ? p.current_bid_cents / 100 : undefined,
    endTime: p.auction_end_at ?? p.drop_at ?? undefined,
    highestBidder: p.highest_bidder_id ?? undefined,
    auctionStatus: p.auction_status,
    bidCount: p.bid_count ?? 0,
    // Rich product fields
    brand: p.brand,
    condition: p.condition as Product['condition'],
    category: p.category,
    subcategory: p.subcategory,
    tags: p.tags,
    images: p.images?.map(img => img.url),
    bulletPoints: p.bullet_points,
    returnDays: p.return_days,
    warrantyInfo: p.warranty_info,
    isDigital: p.is_digital,
    reviewCount: p.review_count ?? 0,
    reviewAvg: p.review_avg ?? 0,
    variantGroups: p.variant_groups?.map(g => ({
      id: g.id,
      productId: g.product_id,
      name: g.name,
      position: g.position,
      options: g.options.map(o => ({
        id: o.id,
        groupId: o.group_id,
        label: o.label,
        value: o.value,
        position: o.position,
      })),
    })),
    variants: p.variants?.map(v => ({
      id: v.id,
      productId: v.product_id,
      sku: v.sku,
      priceCents: v.price_cents,
      price: v.price_cents ? v.price_cents / 100 : undefined,
      inventory: v.inventory,
      imageUrl: v.image_url,
      isDefault: v.is_default,
      optionIds: v.option_ids,
    })),
    specs: p.specs,
    shipping: p.shipping ? {
      freeShipping: p.shipping.free_shipping,
      shippingClass: p.shipping.shipping_class as any,
      flatRateCents: p.shipping.flat_rate_cents,
      shipsFromCountry: p.shipping.ships_from_country,
      shipsFromState: p.shipping.ships_from_state,
      handlingDays: p.shipping.handling_days,
      estimatedDaysMin: p.shipping.estimated_days_min,
      estimatedDaysMax: p.shipping.estimated_days_max,
    } : undefined,
    reviews: p.reviews?.map(r => ({
      id: r.id,
      userName: r.user_name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verifiedPurchase: r.verified_purchase,
      helpfulCount: r.helpful_count,
      images: r.images,
      createdAt: r.created_at,
    })),
    relatedProducts: p.related_products?.map(mapProduct),
    bundles: p.bundles?.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      discountPct: b.discount_pct,
      discountCents: b.discount_cents,
      items: b.items.map(i => ({
        product: i.product ? mapProduct(i.product) : undefined,
        quantity: i.quantity,
      })),
    })),
  };
}

function mapChannel(c: ApiChannel): Channel {
  return {
    id: c.id,
    title: c.title,
    type: c.status as Channel['type'],
    streamUrl: c.stream_url || c.thumbnail_url,
    thumbnailUrl: c.thumbnail_url,
    viewers: c.viewer_count,
    badge: c.badge || undefined,
    category: c.category,
    isPrimary: c.is_primary,
    merchant: {
      name: c.merchant?.name ?? 'Unknown',
      avatar: c.merchant?.avatar ?? '',
    },
    products: (c.products ?? []).map(mapProduct),
    scheduledStartTime: c.scheduled_at ?? undefined,
  };
}

// ── Public API ──────────────────────────────────────────

export async function healthCheck() {
  return apiFetch<{ status: string }>('/health');
}

// Auth
export async function register(email: string, username: string, password: string, role?: string) {
  const res = await apiFetch<ApiAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password, role }),
  });
  setToken(res.token);
  return res;
}

export async function login(email: string, password: string) {
  const res = await apiFetch<ApiAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  return res;
}

export async function devLogin() {
  const res = await apiFetch<ApiAuthResponse>('/auth/dev', { method: 'POST' });
  setToken(res.token);
  return res;
}

export async function guestRegister() {
  const guestId = getGuestId();
  const guestName = getGuestName();
  const res = await apiFetch<ApiAuthResponse>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ guest_id: guestId, guest_name: guestName }),
  });
  setToken(res.token);
  return res;
}

export async function getMe() {
  return apiFetch<ApiAuthResponse['user']>('/users/me');
}

// Channels
export async function getPrimaryChannel(): Promise<Channel> {
  const raw = await apiFetch<ApiChannel>('/channels/primary');
  return mapChannel(raw);
}

export async function getRail(category?: string): Promise<Channel[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const raw = await apiFetch<ApiChannel[]>(`/channels/rail${qs}`);
  return raw.map(mapChannel);
}

export async function getChannelById(id: string): Promise<Channel> {
  const raw = await apiFetch<ApiChannel>(`/channels/${id}`);
  return mapChannel(raw);
}

// Products
export async function getProduct(id: string): Promise<Product> {
  const raw = await apiFetch<ApiProduct>(`/products/${id}`);
  return mapProduct(raw);
}

export async function getChannelProducts(channelId: string): Promise<Product[]> {
  const raw = await apiFetch<ApiProduct[]>(`/channels/${channelId}/products`);
  return raw.map(mapProduct);
}

// Full product detail (includes variants, shipping, reviews, specs, bundles, relations)
export async function getProductFull(id: string): Promise<Product> {
  const raw = await apiFetch<ApiProduct>(`/products/${id}/full`);
  return mapProduct(raw);
}

// Reviews
export async function getProductReviews(productId: string, limit = 10, offset = 0): Promise<Product['reviews']> {
  const raw = await apiFetch<ApiReview[]>(`/products/${productId}/reviews?limit=${limit}&offset=${offset}`);
  return raw.map(r => ({
    id: r.id,
    userName: r.user_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verifiedPurchase: r.verified_purchase,
    helpfulCount: r.helpful_count,
    images: r.images,
    createdAt: r.created_at,
  }));
}

export async function submitReview(productId: string, data: { rating: number; title: string; body: string; images?: string[] }) {
  return apiFetch<{ id: string }>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markReviewHelpful(reviewId: string) {
  return apiFetch<{ helpful_count: number }>(`/reviews/${reviewId}/helpful`, { method: 'POST' });
}

// ── Relay ─────────────────────────────────────────────

export interface RelayMatch {
  timestamp_sec: number;
  transcript_chunk: string;
  confidence: number;
  formatted_time: string;
}

export interface RelayQueryResponse {
  channel_id: string;
  query: string;
  matches: RelayMatch[];
}

export async function searchRelay(channelId: string, query: string): Promise<RelayQueryResponse> {
  return apiFetch<RelayQueryResponse>('/relay/query', {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, query }),
  });
}

export interface RelayEntry {
  id: string;
  channel_id: string;
  transcript_chunk: string;
  timestamp_sec: number;
  created_at: string;
}

export async function getRelayEntries(channelId: string, from = 0, to = 86400): Promise<RelayEntry[]> {
  return apiFetch<RelayEntry[]>(`/relay/${channelId}/entries?from=${from}&to=${to}`);
}

// Social (auth required)
export async function followChannel(channelId: string) {
  return apiFetch<void>(`/users/follow/${channelId}`, { method: 'POST' });
}

export async function unfollowChannel(channelId: string) {
  return apiFetch<void>(`/users/follow/${channelId}`, { method: 'DELETE' });
}

export async function getFollowing(): Promise<Channel[]> {
  const raw = await apiFetch<ApiChannel[]>('/users/following');
  return raw.map(mapChannel);
}

// Checkout (auth required)
export interface CheckoutResponse {
  id: string;
  status: string;
  total_cents: number;
  stripe_client_secret?: string;
  stripe_payment_id?: string;
}

export async function initCheckout(productId: string, quantity: number, channelId: string) {
  return apiFetch<CheckoutResponse>('/checkout', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity, channel_id: channelId }),
  });
}

export interface BidResponse {
  bid: { id: string; product_id: string; user_id: string; amount_cents: number; created_at: string };
  product: ApiProduct;
}

export interface BidHistoryItem {
  id: string;
  product_id: string;
  user_id: string;
  amount_cents: number;
  created_at: string;
}

export async function placeBid(productId: string, amountCents: number) {
  return apiFetch<BidResponse>('/bids', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, amount_cents: amountCents }),
  });
}

export async function getBidHistory(productId: string): Promise<BidHistoryItem[]> {
  return apiFetch<BidHistoryItem[]>(`/products/${productId}/bids`);
}

// ── Creator Studio ─────────────────────────────────────

export async function getCreatorChannels(): Promise<Channel[]> {
  const raw = await apiFetch<ApiChannel[]>('/creator/channels');
  return raw.map(mapChannel);
}

export async function createChannel(data: {
  title: string;
  description?: string;
  category?: string;
  sale_type?: string;
}): Promise<Channel> {
  const raw = await apiFetch<ApiChannel>('/creator/channels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapChannel(raw);
}

export async function updateChannel(
  channelId: string,
  data: Partial<{ title: string; description: string; category: string; thumbnail_url: string; stream_url: string; sale_type: string }>,
): Promise<Channel> {
  const raw = await apiFetch<ApiChannel>(`/creator/channels/${channelId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return mapChannel(raw);
}

export async function deleteChannel(channelId: string) {
  return apiFetch<void>(`/creator/channels/${channelId}`, { method: 'DELETE' });
}

export type GoLiveResponse = {
  status: string;
  rtmp_url: string;
  stream_key: string;
  hls_url: string;
  whip_url: string;
};

export async function goLive(channelId: string) {
  return apiFetch<GoLiveResponse>(`/creator/channels/${channelId}/live`, { method: 'POST' });
}

export async function endStream(channelId: string) {
  return apiFetch<{ status: string }>(`/creator/channels/${channelId}/end`, { method: 'POST' });
}

export async function createProduct(
  channelId: string,
  data: { name: string; description?: string; image_url?: string; price_cents: number; inventory?: number; sale_type?: string },
): Promise<Product> {
  const raw = await apiFetch<ApiProduct>(`/creator/channels/${channelId}/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapProduct(raw);
}

export async function updateProduct(
  channelId: string,
  productId: string,
  data: Partial<{ name: string; description: string; image_url: string; price_cents: number; inventory: number; sale_type: string }>,
) {
  const raw = await apiFetch<ApiProduct>(`/creator/channels/${channelId}/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return mapProduct(raw);
}

export async function deleteProduct(channelId: string, productId: string) {
  return apiFetch<void>(`/creator/channels/${channelId}/products/${productId}`, { method: 'DELETE' });
}

export async function pinProduct(channelId: string, productId: string) {
  return apiFetch<{ pinned: string }>(`/creator/channels/${channelId}/pin`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function unpinProduct(channelId: string) {
  return apiFetch<{ pinned: string }>(`/creator/channels/${channelId}/pin`, {
    method: 'POST',
    body: JSON.stringify({ product_id: '' }),
  });
}

export interface ChannelAnalytics {
  channel_id: string;
  total_viewers: number;
  total_revenue_cents: number;
  total_orders: number;
  total_likes: number;
  conversion_rate: number;
}

export async function getChannelAnalytics(channelId: string): Promise<ChannelAnalytics> {
  return apiFetch<ChannelAnalytics>(`/creator/channels/${channelId}/analytics`);
}

// ── Marketplace ────────────────────────────────────────

export interface MarketplaceSearchParams {
  q?: string;
  category?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
  offset?: number;
}

export async function searchProducts(params: MarketplaceSearchParams): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.condition) qs.set('condition', params.condition);
  if (params.min_price) qs.set('min_price', String(params.min_price));
  if (params.max_price) qs.set('max_price', String(params.max_price));
  if (params.sort) qs.set('sort', params.sort);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const raw = await apiFetch<ApiProduct[]>(`/marketplace/products?${qs.toString()}`);
  return raw.map(mapProduct);
}

export async function getTrendingProducts(limit = 20): Promise<Product[]> {
  const raw = await apiFetch<ApiProduct[]>(`/marketplace/trending?limit=${limit}`);
  return raw.map(mapProduct);
}

// ── Gateway (landing page aggregate) ───────────────────

export interface CategoryCount {
  name: string;
  count: number;
  icon: string;
}

export interface GatewayChannel {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  stream_url: string;
  status: string;
  viewer_count: number;
  sale_type: string;
  is_primary: boolean;
  badge?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Billboard types ──

interface ApiBillboard {
  id: string;
  billboard_type: 'sponsored' | 'promoted' | 'trending' | 'campaign';
  target_type: 'channel' | 'product' | 'campaign';
  target_id?: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  cta_label: string;
  badge_text: string;
  badge_color: string;
  priority: number;
  starts_at: string;
  ends_at?: string;
  status: string;
  impressions: number;
  clicks: number;
  target_channel?: GatewayChannel;
  target_product?: ApiProduct;
}

export interface BillboardPlacement {
  id: string;
  billboardType: 'sponsored' | 'promoted' | 'trending' | 'campaign';
  targetType: 'channel' | 'product' | 'campaign';
  targetId?: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  badgeText: string;
  badgeColor: string;
  impressions: number;
  clicks: number;
  targetChannel?: GatewayChannel;
  targetProduct?: Product;
}

function mapBillboard(b: ApiBillboard): BillboardPlacement {
  return {
    id: b.id,
    billboardType: b.billboard_type,
    targetType: b.target_type,
    targetId: b.target_id,
    title: b.title,
    subtitle: b.subtitle,
    description: b.description,
    imageUrl: b.image_url,
    ctaLabel: b.cta_label,
    badgeText: b.badge_text,
    badgeColor: b.badge_color,
    impressions: b.impressions,
    clicks: b.clicks,
    targetChannel: b.target_channel,
    targetProduct: b.target_product ? mapProduct(b.target_product) : undefined,
  };
}

export interface MarketplaceGatewayData {
  categories: CategoryCount[];
  live_channels: GatewayChannel[];
  trending: ApiProduct[];
  deals: ApiProduct[];
  new_arrivals: ApiProduct[];
  drops: ApiProduct[];
  auctions: ApiProduct[];
  featured_live?: GatewayChannel;
  billboards?: ApiBillboard[];
}

export interface MappedGateway {
  categories: CategoryCount[];
  liveChannels: GatewayChannel[];
  trending: Product[];
  deals: Product[];
  newArrivals: Product[];
  drops: Product[];
  auctions: Product[];
  featuredLive?: GatewayChannel;
  billboards: BillboardPlacement[];
}

export async function getMarketplaceGateway(): Promise<MappedGateway> {
  const raw = await apiFetch<MarketplaceGatewayData>('/marketplace/gateway');
  return {
    categories: raw.categories,
    liveChannels: raw.live_channels,
    trending: raw.trending.map(mapProduct),
    deals: raw.deals.map(mapProduct),
    newArrivals: raw.new_arrivals.map(mapProduct),
    drops: raw.drops.map(mapProduct),
    auctions: raw.auctions.map(mapProduct),
    featuredLive: raw.featured_live,
    billboards: (raw.billboards ?? []).map(mapBillboard),
  };
}

// ── Billboard tracking ──

export async function trackBillboardImpression(billboardId: string) {
  return apiFetch<void>(`/billboards/${billboardId}/impression`, { method: 'POST' }).catch(() => {});
}

export async function trackBillboardClick(billboardId: string) {
  return apiFetch<void>(`/billboards/${billboardId}/click`, { method: 'POST' }).catch(() => {});
}

// ── Shops ──────────────────────────────────────────────

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  return_policy: string;
  shipping_from: string;
  is_verified: boolean;
  status: string;
  products: Product[];
  created_at: string;
}

export async function getShopBySlug(slug: string): Promise<Shop> {
  const raw = await apiFetch<Shop>(`/shops/${slug}`);
  return raw;
}

export async function getMyShop(): Promise<Shop> {
  return apiFetch<Shop>('/shop');
}

export async function createShop(data: {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  shipping_from?: string;
}): Promise<Shop> {
  return apiFetch<Shop>('/shops', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMyShop(data: Partial<{
  name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  return_policy: string;
  shipping_from: string;
}>) {
  return apiFetch<{ status: string }>('/shop', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getMyShopProducts(): Promise<Product[]> {
  const raw = await apiFetch<ApiProduct[]>('/shop/products');
  return raw.map(mapProduct);
}

export async function createShopProduct(data: {
  name: string;
  description?: string;
  image_url?: string;
  price_cents: number;
  original_price_cents?: number;
  inventory?: number;
  sale_type?: string;
  condition?: string;
  brand?: string;
  tags?: string[];
}): Promise<Product> {
  const raw = await apiFetch<ApiProduct>('/shop/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapProduct(raw);
}

export async function updateShopProduct(productId: string, data: Partial<{
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  inventory: number;
}>) {
  return apiFetch<{ status: string }>(`/shop/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function archiveShopProduct(productId: string) {
  return apiFetch<{ status: string }>(`/shop/products/${productId}`, {
    method: 'DELETE',
  });
}

// ── Cart ───────────────────────────────────────────────

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  product?: Product;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  created_at: string;
}

export async function getCart(): Promise<Cart> {
  return apiFetch<Cart>('/cart');
}

export async function addToCart(productId: string, quantity = 1): Promise<CartItem> {
  return apiFetch<CartItem>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateCartItem(itemId: string, quantity: number) {
  return apiFetch<{ status: string }>(`/cart/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string) {
  return apiFetch<{ status: string }>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

// ── Marketplace Checkout ────────────────────────────────

export interface ShippingAddressInput {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
}

export interface MarketplaceCheckoutItem {
  product_id: string;
  quantity: number;
}

export interface MarketplaceCheckoutRequest {
  items: MarketplaceCheckoutItem[];
  shipping_address: ShippingAddressInput;
  shipping_method: string;
  email: string;
  coupon_code?: string;
}

export interface MarketplaceOrderResponse {
  id: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  shipping_method: string;
  items: { id: string; product_id: string; quantity: number; price_cents: number }[];
  created_at: string;
}

export async function marketplaceCheckout(req: MarketplaceCheckoutRequest) {
  return apiFetch<MarketplaceOrderResponse>('/checkout/marketplace', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export interface TaxEstimate {
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  tax_rate: number;
  tax_source?: string;
  discount_cents: number;
  total_cents: number;
}

export async function estimateTax(
  items: MarketplaceCheckoutItem[],
  shippingMethod: string,
  shippingAddress?: ShippingAddressInput,
  couponCode?: string,
) {
  return apiFetch<TaxEstimate>('/checkout/estimate', {
    method: 'POST',
    body: JSON.stringify({
      items,
      shipping_method: shippingMethod,
      shipping_address: shippingAddress,
      coupon_code: couponCode ?? '',
    }),
  });
}

export interface CouponResponse {
  code: string;
  description?: string;
  discount_type?: string;
  discount_value?: number;
  discount_cents: number;
  valid: boolean;
  message?: string;
}

export async function validateCoupon(code: string, subtotalCents: number) {
  return apiFetch<CouponResponse>('/checkout/validate-coupon', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal_cents: subtotalCents }),
  });
}

export interface ShippingAddress {
  id: string;
  user_id: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
}

export async function getShippingAddresses() {
  return apiFetch<ShippingAddress[]>('/shipping-addresses');
}

// ── Seller Programs (CSP + MSP) ────────────────────────

export interface SellerProgram {
  id: string;
  user_id: string;
  program_type: 'csp' | 'msp';
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'rejected' | 'closed';
  tier: 'new' | 'rising' | 'established' | 'partner';
  agreed_at?: string;
  agreement_version: string;
  application_note?: string;
  rejection_reason?: string;
  approved_at?: string;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramCommissionRule {
  id: string;
  program_type: string;
  tier: string;
  commission_pct: number;
  listing_fee_cents: number;
  is_active: boolean;
}

export interface ProgramStatusResponse {
  program: SellerProgram;
  commission: ProgramCommissionRule | null;
}

export interface SellerDashboard {
  program: SellerProgram;
  total_revenue_cents: number;
  total_orders: number;
  pending_payouts_cents: number;
  paid_payouts_cents: number;
  commission_pct: number;
  current_tier: string;
  // CSP-specific
  total_stream_hours?: number;
  total_viewers?: number;
  // MSP-specific
  active_listings?: number;
  pending_orders?: number;
  shipped_orders?: number;
}

export interface SellerPayout {
  id: string;
  program_type: string;
  order_id: string;
  gross_cents: number;
  commission_cents: number;
  net_cents: number;
  payout_status: string;
  stripe_transfer_id?: string;
  paid_at?: string;
  created_at: string;
}

export interface FulfillmentRecord {
  id: string;
  order_id: string;
  seller_id: string;
  fulfillment_type: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  status: string;
  created_at: string;
}

export interface SellerOrderView {
  id: string;
  user_id: string;
  status: string;
  total_cents: number;
  created_at: string;
  items: { id: string; product_id: string; quantity: number; price_cents: number }[];
  fulfillment?: FulfillmentRecord;
  buyer_email: string;
  shipping_address?: ShippingAddress;
}

export interface SellerAnalyticsDay {
  date: string;
  revenue_cents: number;
  orders_count: number;
  units_sold: number;
  views: number;
  conversion_rate: number;
}

// Enrollment
export async function enrollProgram(programType: 'csp' | 'msp', applicationNote = '') {
  return apiFetch<SellerProgram>('/programs/enroll', {
    method: 'POST',
    body: JSON.stringify({ program_type: programType, agreed_to_terms: true, application_note: applicationNote }),
  });
}

export async function getMyPrograms(): Promise<SellerProgram[]> {
  return apiFetch<SellerProgram[]>('/programs');
}

export async function getProgramStatus(type: 'csp' | 'msp'): Promise<ProgramStatusResponse> {
  return apiFetch<ProgramStatusResponse>(`/programs/${type}`);
}

// Dashboards
export async function getCSPDashboard(): Promise<SellerDashboard> {
  return apiFetch<SellerDashboard>('/programs/csp/dashboard');
}

export async function getMSPDashboard(): Promise<SellerDashboard> {
  return apiFetch<SellerDashboard>('/programs/msp/dashboard');
}

// Seller orders
export async function getSellerOrders(
  type: 'csp' | 'msp',
  params?: { status?: string; limit?: number; offset?: number },
): Promise<SellerOrderView[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<SellerOrderView[]>(`/programs/${type}/orders?${qs.toString()}`);
}

// Payouts
export async function getSellerPayouts(
  type: 'csp' | 'msp',
  params?: { status?: string; limit?: number; offset?: number },
): Promise<SellerPayout[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<SellerPayout[]>(`/programs/${type}/payouts?${qs.toString()}`);
}

// Fulfillment
export async function updateOrderFulfillment(orderId: string, data: { tracking_number?: string; carrier?: string; status?: string }) {
  return apiFetch<FulfillmentRecord>(`/programs/orders/${orderId}/fulfillment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Analytics
export async function getSellerAnalytics(
  type: 'csp' | 'msp',
  from?: string,
  to?: string,
): Promise<SellerAnalyticsDay[]> {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return apiFetch<SellerAnalyticsDay[]>(`/programs/${type}/analytics?${qs.toString()}`);
}

// ── Password Reset ──────────────────────────────────────────

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// ── Uploads (S3 presigned) ──────────────────────────────────

export interface PresignRequest {
  entity_type: 'product' | 'channel' | 'user' | 'shop' | 'video';
  entity_id: string;
  filename: string;
  content_type: string;
}

export interface PresignResponse {
  upload_id: string;
  upload_url: string;
  public_url: string;
}

export async function presignUpload(req: PresignRequest): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function completeUpload(uploadId: string) {
  return apiFetch<{ id: string; url: string; status: string }>(`/uploads/${uploadId}/complete`, {
    method: 'POST',
  });
}

/**
 * Upload a file to S3 via presigned URL, then mark complete.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  entityType: PresignRequest['entity_type'],
  entityId: string,
): Promise<string> {
  const { upload_id, upload_url, public_url } = await presignUpload({
    entity_type: entityType,
    entity_id: entityId,
    filename: file.name,
    content_type: file.type,
  });

  // Direct upload to S3
  await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  await completeUpload(upload_id);
  return public_url;
}

// ── Videos / VOD ────────────────────────────────────────────

export interface ApiVideo {
  id: string;
  channel_id: string;
  creator_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration_sec: number;
  file_size_bytes: number;
  status: 'processing' | 'ready' | 'failed';
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  merchant?: ApiMerchant;
  channel_title?: string;
  products?: ApiProduct[];
}

export interface ApiFeedItem {
  item_type: 'channel' | 'video';
  channel?: ApiChannel;
  video?: ApiVideo;
}

export interface Video {
  id: string;
  channelId: string;
  creatorId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  fileSizeBytes: number;
  status: 'processing' | 'ready' | 'failed';
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  merchant?: { name: string; avatar: string };
  channelTitle?: string;
  products?: Product[];
}

function mapVideo(v: ApiVideo): Video {
  return {
    id: v.id,
    channelId: v.channel_id,
    creatorId: v.creator_id,
    title: v.title,
    description: v.description,
    videoUrl: v.video_url,
    thumbnailUrl: v.thumbnail_url,
    durationSec: v.duration_sec,
    fileSizeBytes: v.file_size_bytes,
    status: v.status,
    viewCount: v.view_count,
    likeCount: v.like_count,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    merchant: v.merchant ? { name: v.merchant.name, avatar: v.merchant.avatar ?? '' } : undefined,
    channelTitle: v.channel_title,
    products: (v.products ?? []).map(mapProduct),
  };
}

function mapFeedItemToChannel(item: ApiFeedItem): Channel {
  if (item.item_type === 'channel' && item.channel) {
    return { ...mapChannel(item.channel), _feedItemType: 'channel' };
  }
  const v = item.video!;
  return {
    id: v.id,
    title: v.title,
    type: 'VOD',
    streamUrl: v.video_url,
    thumbnailUrl: v.thumbnail_url,
    viewers: v.view_count,
    category: '',
    merchant: {
      name: v.merchant?.name ?? 'Unknown',
      avatar: v.merchant?.avatar ?? '',
    },
    products: (v.products ?? []).map(mapProduct),
    _feedItemType: 'video',
  };
}

export async function getUnifiedFeed(category?: string, limit?: number): Promise<Channel[]> {
  const qs = new URLSearchParams();
  if (category) qs.set('category', category);
  if (limit) qs.set('limit', String(limit));
  const items = await apiFetch<ApiFeedItem[]>(`/feed?${qs.toString()}`);
  return items.map(mapFeedItemToChannel);
}

export async function getVideo(id: string): Promise<Video> {
  const v = await apiFetch<ApiVideo>(`/videos/${id}`);
  return mapVideo(v);
}

export async function getChannelVideos(channelId: string, limit = 20, offset = 0): Promise<Video[]> {
  const items = await apiFetch<ApiVideo[]>(`/channels/${channelId}/videos?limit=${limit}&offset=${offset}`);
  return items.map(mapVideo);
}

export async function createVideo(channelId: string, data: {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_sec?: number;
  file_size_bytes?: number;
  product_ids?: string[];
}): Promise<Video> {
  const v = await apiFetch<ApiVideo>(`/creator/channels/${channelId}/videos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapVideo(v);
}

export async function getMyChannelVideos(channelId: string): Promise<Video[]> {
  const items = await apiFetch<ApiVideo[]>(`/creator/channels/${channelId}/videos`);
  return items.map(mapVideo);
}

export async function updateVideo(videoId: string, data: {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  status?: string;
}): Promise<Video> {
  const v = await apiFetch<ApiVideo>(`/creator/videos/${videoId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return mapVideo(v);
}

export async function deleteVideo(videoId: string): Promise<void> {
  await apiFetch<unknown>(`/creator/videos/${videoId}`, { method: 'DELETE' });
}

export async function setVideoProducts(videoId: string, productIds: string[]): Promise<Video> {
  const v = await apiFetch<ApiVideo>(`/creator/videos/${videoId}/products`, {
    method: 'PUT',
    body: JSON.stringify({ product_ids: productIds }),
  });
  return mapVideo(v);
}

export interface AdminStats {
  total_users: number;
  total_orders: number;
  total_revenue_cents: number;
  live_channels: number;
  pending_programs: number;
  active_products: number;
  pending_payouts_cents: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats');
}

export async function adminListUsers(params?: { role?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.role) qs.set('role', params.role);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<{ users: any[]; total: number }>(`/admin/users?${qs.toString()}`);
}

export async function adminListOrders(params?: { status?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<{ orders: any[]; total: number }>(`/admin/orders?${qs.toString()}`);
}

export async function adminListPrograms(params?: { status?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<{ programs: SellerProgram[]; total: number }>(`/admin/programs?${qs.toString()}`);
}

export async function adminUpdateProgram(programId: string, status: string, reason = '') {
  return apiFetch<{ status: string }>(`/admin/programs/${programId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason }),
  });
}

export async function adminProcessPayouts() {
  return apiFetch<{ processed: number; failed: number; total: number }>('/admin/payouts/process', {
    method: 'POST',
  });
}

// ── Admin Billboards ─────────────────────────────────────

export async function adminListBillboards(params?: { status?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  return apiFetch<{ billboards: ApiBillboard[]; total: number }>(`/admin/billboards?${qs.toString()}`);
}

export async function adminGetBillboard(id: string) {
  return apiFetch<ApiBillboard>(`/admin/billboards/${id}`);
}

export async function adminCreateBillboard(data: {
  billboard_type: string;
  target_type: string;
  target_id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  cta_label?: string;
  badge_text?: string;
  badge_color?: string;
  priority?: number;
  starts_at: string;
  ends_at?: string;
  status?: string;
  budget_cents?: number;
  cpm_cents?: number;
}) {
  return apiFetch<ApiBillboard>('/admin/billboards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateBillboard(id: string, data: Partial<{
  billboard_type: string;
  target_type: string;
  target_id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  cta_label: string;
  badge_text: string;
  badge_color: string;
  priority: number;
  starts_at: string;
  ends_at: string;
  status: string;
  budget_cents: number;
  cpm_cents: number;
}>) {
  return apiFetch<{ status: string }>(`/admin/billboards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteBillboard(id: string) {
  return apiFetch<void>(`/admin/billboards/${id}`, { method: 'DELETE' });
}

// ── Guest Identity ─────────────────────────────────────
// Every visitor gets a persistent anonymous identity so they can chat and
// be counted as a viewer without signing up.

const GUEST_ADJECTIVES = ['Swift', 'Bold', 'Chill', 'Lucky', 'Neon', 'Vivid', 'Sleek', 'Fizzy', 'Zen', 'Dope'];
const GUEST_NOUNS = ['Panda', 'Falcon', 'Fox', 'Tiger', 'Otter', 'Phoenix', 'Wolf', 'Lynx', 'Hare', 'Raven'];

function generateGuestName(): string {
  const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export function getGuestId(): string {
  let id = localStorage.getItem('greggie_guest_id');
  if (!id) {
    id = 'guest-' + crypto.randomUUID();
    localStorage.setItem('greggie_guest_id', id);
  }
  return id;
}

export function getGuestName(): string {
  let name = localStorage.getItem('greggie_guest_name');
  if (!name) {
    name = generateGuestName();
    localStorage.setItem('greggie_guest_name', name);
  }
  return name;
}

/** Returns the display name to use in chat — logged-in username or guest name */
export function getDisplayName(user: { username?: string; display_name?: string } | null): string {
  if (user) return user.display_name || user.username || 'User';
  return getGuestName();
}
