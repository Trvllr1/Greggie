import { FeedItem } from "../services/api";
import { useMemo } from "react";

interface SearchResult {
  items: FeedItem[];
  matchCount: number;
}

export function useSearch(items: FeedItem[], query: string): SearchResult {
  return useMemo(() => {
    if (!query.trim()) return { items, matchCount: items.length };

    const q = query.toLowerCase().trim();
    const filtered = items.filter((item) => {
      const caption = item.content.caption?.toLowerCase() || "";
      const author = item.content.author_handle?.toLowerCase() || "";
      const platform = item.source.platform.toLowerCase();
      const url = item.source.origin_url.toLowerCase();
      return (
        caption.includes(q) ||
        author.includes(q) ||
        platform.includes(q) ||
        url.includes(q)
      );
    });

    return { items: filtered, matchCount: filtered.length };
  }, [items, query]);
}
