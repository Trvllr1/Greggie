import { useState, useEffect, useCallback, useRef } from 'react';
import type { Channel } from '../data/mockData';
import { MOCK_CHANNELS } from '../data/mockData';
import * as api from '../services/api';

interface UseChannelsResult {
  channels: Channel[];
  primary: Channel | null;
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  refresh: () => void;
}

/**
 * Fetches the channel rail from the backend.
 * Falls back to MOCK_CHANNELS when the backend is unreachable.
 * Polls every 15s to pick up status changes (Go Live / End Stream).
 */
export function useChannels(category?: string): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [primary, setPrimary] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(true);
  const mounted = useRef(true);
  const primaryIdRef = useRef<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      setError(null);

      // Unified feed returns both live channels and VOD videos as Channel-shaped objects
      const [feedData, primaryData] = await Promise.allSettled([
        api.getUnifiedFeed(category),
        api.getPrimaryChannel(),
      ]);

      if (!mounted.current) return;

      if (feedData.status === 'fulfilled') {
        setUsingMock(false);
        if (feedData.value.length > 0) {
          const primaryId = primaryData.status === 'fulfilled' ? primaryData.value.id : null;
          const mapped = feedData.value.map(ch => ({
            ...ch,
            isPrimary: ch.id === primaryId,
          }));
          setChannels(mapped);
          if (primaryData.status === 'fulfilled' && primaryData.value.id !== primaryIdRef.current) {
            primaryIdRef.current = primaryData.value.id;
            setPrimary({ ...primaryData.value, isPrimary: true });
          }
        } else {
          // Backend returned empty — fall back to mocks
          setChannels(MOCK_CHANNELS);
          const fallback = MOCK_CHANNELS.find(c => c.isPrimary) ?? MOCK_CHANNELS[0];
          if (fallback.id !== primaryIdRef.current) {
            primaryIdRef.current = fallback.id;
            setPrimary(fallback);
          }
        }
      } else {
        // Backend unreachable — fall back to mocks
        setChannels(MOCK_CHANNELS);
        const fallback = MOCK_CHANNELS.find(c => c.isPrimary) ?? MOCK_CHANNELS[0];
        if (fallback.id !== primaryIdRef.current) {
          primaryIdRef.current = fallback.id;
          setPrimary(fallback);
        }
        setUsingMock(true);
        setError(feedData.reason?.message ?? 'Failed to load channels');
      }
    } catch (err) {
      if (!mounted.current) return;
      setChannels(MOCK_CHANNELS);
      const fallback = MOCK_CHANNELS.find(c => c.isPrimary) ?? MOCK_CHANNELS[0];
      if (fallback.id !== primaryIdRef.current) {
        primaryIdRef.current = fallback.id;
        setPrimary(fallback);
      }
      setUsingMock(true);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    mounted.current = true;
    fetchChannels();

    // Poll every 15s so rail picks up Go Live / End Stream changes
    const interval = setInterval(fetchChannels, 15_000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [fetchChannels]);

  return { channels, primary, loading, error, usingMock, refresh: fetchChannels };
}
