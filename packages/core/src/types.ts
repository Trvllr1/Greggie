// ─── Greggie Core Types ─── Master Design Canvas Section 16 ───

// ── User & Auth ──

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  role: "viewer" | "creator" | "admin";
  onboarding_complete: boolean;
  preferred_categories: string[];
  created_at: string;
  updated_at: string;
}

// ── Wallet ──

export interface Wallet {
  id: string;
  user_id: string;
  balance_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

// ── Channel ──

export type ChannelStatus = "LIVE" | "RELAY" | "OFFLINE" | "SCHEDULED";

export type SaleType = "buy_now" | "auction" | "drop";

export interface Channel {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  stream_url: string;
  status: ChannelStatus;
  viewer_count: number;
  sale_type: SaleType;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Product ──

export interface Product {
  id: string;
  channel_id: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  original_price_cents: number | null;
  inventory: number;
  sale_type: SaleType;
  is_pinned: boolean;
  auction_end_at: string | null;
  drop_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Order ──

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  channel_id: string;
  status: OrderStatus;
  total_cents: number;
  stripe_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_cents: number;
}

// ── Checkout ──

export type CheckoutStatus = "INIT" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface CheckoutSession {
  id: string;
  user_id: string;
  channel_id: string;
  status: CheckoutStatus;
  stripe_session_id: string | null;
  expires_at: string;
  created_at: string;
}

// ── Relay AI ──

export interface RelayEntry {
  id: string;
  channel_id: string;
  transcript_chunk: string;
  timestamp_sec: number;
  embedding_vector: number[] | null;
  created_at: string;
}

// ── Events / Analytics ──

export type EventType =
  | "view_start"
  | "view_end"
  | "channel_switch"
  | "purchase"
  | "add_to_cart"
  | "checkout_start"
  | "checkout_complete"
  | "follow"
  | "unfollow"
  | "gift_sent";

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  channel_id: string | null;
  event_type: EventType;
  payload: Record<string, unknown>;
  created_at: string;
}

// ── Follow ──

export interface Follow {
  user_id: string;
  channel_id: string;
  created_at: string;
}

// ── Session State Machine ──

export type SessionState =
  | "ENTRY_LOBBY"
  | "ONBOARDING"
  | "WATCHING_PC"
  | "BROWSING_RAIL"
  | "CHECKOUT_ACTIVE"
  | "BIDDING_ACTIVE"
  | "PURCHASE_COMPLETE"
  | "USER_PROFILE"
  | "CREATOR_STUDIO";

// ── Categories ──

export const CATEGORIES = [
  "Tech",
  "Fashion",
  "Collectibles",
  "Beauty",
  "Food",
  "Art",
  "Fitness",
  "Automotive",
  "Home",
  "Luxury",
  "Pets",
  "Travel",
] as const;

export type Category = (typeof CATEGORIES)[number];

// ── API Response Envelope ──

export interface ApiResponse<T> {
  data: T;
  meta?: {
    next_cursor?: string;
    total?: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}
