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
 */
export function useChannels(category?: string): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [primary, setPrimary] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(true);
  const mounted = useRef(true);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [railData, primaryData] = await Promise.allSettled([
        api.getRail(category),
        api.getPrimaryChannel(),
      ]);

      if (!mounted.current) return;

      if (railData.status === 'fulfilled' && railData.value.length > 0) {
        // Mark the primary channel
        const primaryId = primaryData.status === 'fulfilled' ? primaryData.value.id : null;
        const mapped = railData.value.map(ch => ({
          ...ch,
          isPrimary: ch.id === primaryId,
        }));
        setChannels(mapped);
        setUsingMock(false);
        if (primaryData.status === 'fulfilled') {
          setPrimary({ ...primaryData.value, isPrimary: true });
        }
      } else {
        // Backend returned empty or failed — use mocks
        setChannels(MOCK_CHANNELS);
        setPrimary(MOCK_CHANNELS.find(c => c.isPrimary) ?? MOCK_CHANNELS[0]);
        setUsingMock(true);
        if (railData.status === 'rejected') {
          setError(railData.reason?.message ?? 'Failed to load channels');
        }
      }
    } catch (err) {
      if (!mounted.current) return;
      setChannels(MOCK_CHANNELS);
      setPrimary(MOCK_CHANNELS.find(c => c.isPrimary) ?? MOCK_CHANNELS[0]);
      setUsingMock(true);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    mounted.current = true;
    fetchChannels();
    return () => { mounted.current = false; };
  }, [fetchChannels]);

  return { channels, primary, loading, error, usingMock, refresh: fetchChannels };
}
