import type {
  ApiResponse,
  Channel,
  Product,
  User,
  CheckoutSession,
  Order,
} from "./types";

// ─── API Client ─── Master Design Section 15 ───

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
    return this.request<{ status: string }>("GET", "/health");
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

  // ── Channels ──
  getPrimaryChannel() {
    return this.request<ApiResponse<Channel>>("GET", "/channels/primary");
  }

  getRail(cursor?: string) {
    const qs = cursor ? `?cursor=${cursor}` : "";
    return this.request<ApiResponse<Channel[]>>("GET", `/channels/rail${qs}`);
  }

  switchChannel(channelId: string) {
    return this.request<ApiResponse<Channel>>("POST", "/channels/switch", {
      channel_id: channelId,
    });
  }

  // ── Products ──
  getProduct(productId: string) {
    return this.request<ApiResponse<Product>>("GET", `/products/${productId}`);
  }

  getChannelProducts(channelId: string) {
    return this.request<ApiResponse<Product[]>>(
      "GET",
      `/channels/${channelId}/products`
    );
  }

  // ── Checkout ──
  initCheckout(productId: string, quantity: number) {
    return this.request<ApiResponse<CheckoutSession>>(
      "POST",
      "/checkout/init",
      { product_id: productId, quantity }
    );
  }

  confirmCheckout(sessionId: string) {
    return this.request<ApiResponse<Order>>("POST", "/checkout/confirm", {
      session_id: sessionId,
    });
  }

  // ── User ──
  getMe() {
    return this.request<ApiResponse<User>>("GET", "/users/me");
  }

  followChannel(channelId: string) {
    return this.request<void>("POST", `/users/follow`, {
      channel_id: channelId,
    });
  }

  unfollowChannel(channelId: string) {
    return this.request<void>("DELETE", `/users/follow`, {
      channel_id: channelId,
    });
  }

  // ── Events ──
  trackEvent(
    eventType: string,
    channelId?: string,
    payload?: Record<string, unknown>
  ) {
    return this.request<void>("POST", "/events", {
      event_type: eventType,
      channel_id: channelId,
      payload,
    });
  }

  // ── Relay AI ──
  queryRelay(channelId: string, query: string) {
    return this.request<
      ApiResponse<{ timestamp_sec: number; confidence: number; snippet: string }>
    >("POST", "/relay/query", { channel_id: channelId, query });
  }
}
