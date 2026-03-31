import { useState, useEffect, useRef } from 'react';
import type { Product } from '@greggie/core';
import { getApiClient } from './useApi';

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

export function useProduct(productId: string | undefined): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!productId) {
      setLoading(false);
      return;
    }

    const client = getApiClient();
    client
      .getProduct(productId)
      .then((p) => {
        if (mounted.current) setProduct(p);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => {
      mounted.current = false;
    };
  }, [productId]);

  return { product, loading, error };
}
