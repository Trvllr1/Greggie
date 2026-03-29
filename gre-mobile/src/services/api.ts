import env from "../config/env";

const API_BASE_URL = env.API_BASE_URL;

export interface FeedItem {
  id: string;
  user_id?: string;
  source: {
    platform: "instagram" | "tiktok" | "youtube" | "facebook" | "reddit" | "open-web";
    origin_url: string;
    badge_color?: string;
  };
  content: {
    author_handle?: string;
    caption?: string;
    media_url?: string;
    is_video?: boolean;
    embed_html?: string;
  };
  collected_at?: string;
}

export async function submitUrl(url: string): Promise<FeedItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.status}`);
  }
  return response.json();
}

export interface FeedResponse {
  items: FeedItem[];
  next_cursor: string;
}

export async function getFeed(
  userId?: string,
  cursor?: string,
  limit: number = 20
): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/v1/feed?${qs}`);
  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status}`);
  }
  return response.json();
}

export async function deleteItem(id: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/feed/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

// ── Collections ──

export interface Collection {
  id: string;
  user_id?: string;
  name: string;
  emoji: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export async function getCollections(userId?: string): Promise<Collection[]> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  const response = await fetch(`${API_BASE_URL}/api/v1/collections?${params}`);
  if (!response.ok) throw new Error(`Collections fetch failed: ${response.status}`);
  return response.json();
}

export async function getCollectionItems(collectionId: string): Promise<{ collection: Collection; items: FeedItem[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/collections/${encodeURIComponent(collectionId)}`);
  if (!response.ok) throw new Error(`Collection fetch failed: ${response.status}`);
  return response.json();
}

export async function createCollection(name: string, emoji?: string): Promise<Collection> {
  const response = await fetch(`${API_BASE_URL}/api/v1/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, emoji: emoji || "" }),
  });
  if (!response.ok) throw new Error(`Create collection failed: ${response.status}`);
  return response.json();
}

export async function updateCollection(id: string, name: string, emoji?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, emoji: emoji || "" }),
  });
  if (!response.ok) throw new Error(`Update collection failed: ${response.status}`);
}

export async function deleteCollection(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Delete collection failed: ${response.status}`);
}

export async function addItemToCollection(collectionId: string, feedItemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/collections/${encodeURIComponent(collectionId)}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feed_item_id: feedItemId }),
  });
  if (!response.ok) throw new Error(`Add to collection failed: ${response.status}`);
}

export async function removeItemFromCollection(collectionId: string, feedItemId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(feedItemId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error(`Remove from collection failed: ${response.status}`);
}

// ── Share Stack ──

export interface StackItem {
  id: string;
  user_id?: string;
  url: string;
  source: FeedItem["source"];
  content: FeedItem["content"];
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
}

export async function getStack(userId?: string): Promise<StackItem[]> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  const response = await fetch(`${API_BASE_URL}/api/v1/stack?${params}`);
  if (!response.ok) throw new Error(`Stack fetch failed: ${response.status}`);
  return response.json();
}

export async function getStackCount(userId?: string): Promise<number> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  const response = await fetch(`${API_BASE_URL}/api/v1/stack/count?${params}`);
  if (!response.ok) throw new Error(`Stack count failed: ${response.status}`);
  const data = await response.json();
  return data.count;
}

export async function addToStack(url: string): Promise<StackItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/stack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`Add to stack failed: ${response.status}`);
  return response.json();
}

export async function acceptStackItem(id: string, collectionId?: string): Promise<FeedItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/stack/${encodeURIComponent(id)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection_id: collectionId || "" }),
  });
  if (!response.ok) throw new Error(`Accept stack item failed: ${response.status}`);
  return response.json();
}

export async function dismissStackItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/stack/${encodeURIComponent(id)}/dismiss`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Dismiss stack item failed: ${response.status}`);
}
