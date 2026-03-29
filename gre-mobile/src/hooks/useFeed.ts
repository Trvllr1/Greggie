import { useCallback, useEffect, useRef, useState } from "react";
import { getFeed, deleteItem as apiDeleteItem, FeedItem } from "../services/api";

export function useFeed(userId?: string) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Track which item indices are currently visible (in-viewport)
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  // The single "active" index — the most centered visible item (for autoplay)
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeed(userId);
      setItems(data.items ?? []);
      setNextCursor(data.next_cursor || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getFeed(userId, nextCursor);
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setNextCursor(data.next_cursor || null);
    } catch {
      // Silently fail on pagination — user can retry by scrolling
    } finally {
      setLoadingMore(false);
    }
  }, [userId, nextCursor, loadingMore]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const removeItem = useCallback(async (id: string) => {
    try {
      await apiDeleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }, []);

  // Viewability config callback for FlatList's onViewableItemsChanged
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const indices = new Set(
        viewableItems
          .map((item) => item.index)
          .filter((i): i is number => i !== null)
      );
      setVisibleIndices(indices);

      // Pick the middle visible index as the "active" autoplay item
      const sorted = [...indices].sort((a, b) => a - b);
      setActiveIndex(
        sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null
      );
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return {
    items,
    loading,
    loadingMore,
    error,
    refresh: fetchFeed,
    fetchMore,
    visibleIndices,
    activeIndex,
    removeItem,
    onViewableItemsChanged,
    viewabilityConfig,
  };
}
