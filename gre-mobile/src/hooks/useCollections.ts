import { useCallback, useEffect, useState } from "react";
import {
  Collection,
  getCollections,
  createCollection as apiCreate,
  updateCollection as apiUpdate,
  deleteCollection as apiDelete,
  addItemToCollection as apiAddItem,
  removeItemFromCollection as apiRemoveItem,
} from "../services/api";

export function useCollections(userId?: string) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCollections(userId);
      setCollections(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const create = useCallback(async (name: string, emoji?: string) => {
    try {
      const col = await apiCreate(name, emoji);
      setCollections((prev) => [col, ...prev]);
      return col;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
      return null;
    }
  }, []);

  const update = useCallback(async (id: string, name: string, emoji?: string) => {
    try {
      await apiUpdate(id, name, emoji);
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name, emoji: emoji || c.emoji } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await apiDelete(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }, []);

  const addItem = useCallback(async (collectionId: string, feedItemId: string) => {
    try {
      await apiAddItem(collectionId, feedItemId);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, item_count: c.item_count + 1 } : c
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }, []);

  const removeItem = useCallback(async (collectionId: string, feedItemId: string) => {
    try {
      await apiRemoveItem(collectionId, feedItemId);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, item_count: Math.max(0, c.item_count - 1) } : c
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  }, []);

  return {
    collections,
    loading,
    error,
    refresh: fetchCollections,
    create,
    update,
    remove,
    addItem,
    removeItem,
  };
}
