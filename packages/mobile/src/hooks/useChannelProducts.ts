import { useState, useEffect, useRef } from 'react';
import type { Product } from '@greggie/core';
import { getApiClient } from './useApi';

interface UseChannelProductsResult {
  products: Product[];
  loading: boolean;
}

export function useChannelProducts(channelId: string | undefined): UseChannelProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!channelId) return;

    setLoading(true);
    const client = getApiClient();
    client
      .getChannelProducts(channelId)
      .then((p) => {
        if (mounted.current) setProducts(p);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, [channelId]);

  return { products, loading };
}
