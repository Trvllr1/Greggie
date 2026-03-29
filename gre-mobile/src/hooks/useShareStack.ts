import { useCallback, useEffect, useState } from "react";
import {
  StackItem,
  FeedItem,
  getStack,
  getStackCount,
  acceptStackItem as apiAccept,
  dismissStackItem as apiDismiss,
} from "../services/api";

export function useShareStack(userId?: string) {
  const [items, setItems] = useState<StackItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStack = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStack(userId);
      setItems(data ?? []);
      setCount(data?.length ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stack");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchCount = useCallback(async () => {
    try {
      const c = await getStackCount(userId);
      setCount(c);
    } catch {
      // Silent — badge just won't update
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const accept = useCallback(async (id: string, collectionId?: string): Promise<FeedItem | null> => {
    try {
      const feedItem = await apiAccept(id, collectionId);
      setItems((prev) => prev.filter((s) => s.id !== id));
      setCount((prev) => Math.max(0, prev - 1));
      return feedItem;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept");
      return null;
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    try {
      await apiDismiss(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dismiss");
    }
  }, []);

  return {
    items,
    count,
    loading,
    error,
    refresh: fetchStack,
    refreshCount: fetchCount,
    accept,
    dismiss,
  };
}
