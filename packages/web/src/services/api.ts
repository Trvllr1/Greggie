/**
 * API service — maps backend (snake_case) responses to local view-model types.
 * Falls back gracefully when backend is unavailable.
 */

import type { Channel, Product } from '../data/mockData';

// ── Config ──────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
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
  };
}

function mapChannel(c: ApiChannel): Channel {
  return {
    id: c.id,
    title: c.title,
    type: c.status as Channel['type'],
    streamUrl: c.stream_url || c.thumbnail_url,
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

export interface MarketplaceGatewayData {
  categories: CategoryCount[];
  live_channels: GatewayChannel[];
  trending: ApiProduct[];
  deals: ApiProduct[];
  new_arrivals: ApiProduct[];
  drops: ApiProduct[];
  auctions: ApiProduct[];
  featured_live?: GatewayChannel;
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
  };
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
  discount_cents: number;
  total_cents: number;
}

export async function estimateTax(items: MarketplaceCheckoutItem[], shippingMethod: string, couponCode?: string) {
  return apiFetch<TaxEstimate>('/checkout/estimate', {
    method: 'POST',
    body: JSON.stringify({ items, shipping_method: shippingMethod, coupon_code: couponCode ?? '' }),
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
