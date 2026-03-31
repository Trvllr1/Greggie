import { useState, useEffect, useCallback, useRef } from 'react';
import type { Channel } from '@greggie/core';
import { getApiClient } from './useApi';
import { DEMO_CHANNELS } from '../demoData';

interface UseChannelsResult {
  channels: Channel[];
  primary: Channel | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useChannels(category?: string): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [primary, setPrimary] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const client = getApiClient();
      const [railResult, primaryResult] = await Promise.allSettled([
        client.getRail(category),
        client.getPrimaryChannel(),
      ]);

      if (!mounted.current) return;

      if (railResult.status === 'fulfilled' && railResult.value.length > 0) {
        const primaryId = primaryResult.status === 'fulfilled' ? primaryResult.value.id : null;
        const mapped = railResult.value.map(ch => ({
          ...ch,
          _isPrimary: ch.id === primaryId,
        }));
        setChannels(mapped);
        if (primaryResult.status === 'fulfilled') {
          setPrimary(primaryResult.value);
        }
      } else {
        // Fallback to demo data when backend is unreachable or returns empty
        setChannels(DEMO_CHANNELS);
        setPrimary(DEMO_CHANNELS[0]);
      }
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Fallback to demo data on error
      setChannels(DEMO_CHANNELS);
      setPrimary(DEMO_CHANNELS[0]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    mounted.current = true;
    fetchChannels();
    return () => { mounted.current = false; };
  }, [fetchChannels]);

  return { channels, primary, loading, error, refresh: fetchChannels };
}
