import type {
  Channel,
  Product,
  User,
  Order,
} from "./types";

// ─── API Client ─── Master Design Section 15 ───
// Matches actual Go backend response shapes (no ApiResponse wrapper).

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ── Health ──
  health() {
    return this.request<{ status: string; service: string }>("GET", "/health");
  }

  // ── Auth ──
  register(email: string, username: string, password: string) {
    return this.request<{ token: string; user: User }>("POST", "/auth/register", {
      email,
      username,
      password,
    });
  }

  login(email: string, password: string) {
    return this.request<{ token: string; user: User }>("POST", "/auth/login", {
      email,
      password,
    });
  }

  devLogin() {
    return this.request<{ token: string; user: User }>("POST", "/auth/dev");
  }

  // ── Channels ──
  getPrimaryChannel() {
    return this.request<Channel>("GET", "/channels/primary");
  }

  getRail(category?: string) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<Channel[]>("GET", `/channels/rail${qs}`);
  }

  getChannelById(channelId: string) {
    return this.request<Channel>("GET", `/channels/${channelId}`);
  }

  // ── Products ──
  getProduct(productId: string) {
    return this.request<Product>("GET", `/products/${productId}`);
  }

  getChannelProducts(channelId: string) {
    return this.request<Product[]>(
      "GET",
      `/channels/${channelId}/products`
    );
  }

  // ── Checkout ──
  initCheckout(productId: string, quantity: number, channelId: string) {
    return this.request<Order>(
      "POST",
      "/checkout",
      { product_id: productId, quantity, channel_id: channelId }
    );
  }

  // ── Bids ──
  placeBid(productId: string, amountCents: number) {
    return this.request<void>("POST", "/bids", {
      product_id: productId,
      amount_cents: amountCents,
    });
  }

  // ── User ──
  getMe() {
    return this.request<User>("GET", "/users/me");
  }

  followChannel(channelId: string) {
    return this.request<void>("POST", `/users/follow/${channelId}`);
  }

  unfollowChannel(channelId: string) {
    return this.request<void>("DELETE", `/users/follow/${channelId}`);
  }

  getFollowing() {
    return this.request<Channel[]>("GET", "/users/following");
  }

  // ── Relay AI ──
  searchRelay(channelId: string, query: string) {
    return this.request<{
      matches: {
        timestamp_sec: number;
        transcript_chunk: string;
        confidence: number;
        formatted_time: string;
      }[];
    }>("POST", "/relay/query", { channel_id: channelId, query });
  }
}
