import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// We need to mock api before importing the hook
vi.mock('../../services/api', () => ({
  getRail: vi.fn(),
  getPrimaryChannel: vi.fn(),
}));

import * as api from '../../services/api';
import { useChannels } from '../useChannels';

const mockChannel = (id: string, overrides = {}) => ({
  id,
  title: `Channel ${id}`,
  type: 'LIVE' as const,
  streamUrl: 'https://example.com/stream',
  viewers: 10,
  category: 'Tech',
  products: [],
  merchant: { name: 'Store', avatar: '' },
  ...overrides,
});

describe('useChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to mock data when API fails', async () => {
    (api.getRail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    (api.getPrimaryChannel as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useChannels());

    // Wait for loading to finish
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usingMock).toBe(true);
    expect(result.current.channels.length).toBeGreaterThan(0);
    expect(result.current.error).toBe('offline');
  });

  it('uses real data when API succeeds', async () => {
    const channels = [mockChannel('r1'), mockChannel('r2')];
    const primary = mockChannel('r1', { is_primary: true });

    (api.getRail as ReturnType<typeof vi.fn>).mockResolvedValue(channels);
    (api.getPrimaryChannel as ReturnType<typeof vi.fn>).mockResolvedValue(primary);

    const { result } = renderHook(() => useChannels());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usingMock).toBe(false);
    expect(result.current.channels).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('passes category to getRail', async () => {
    (api.getRail as ReturnType<typeof vi.fn>).mockResolvedValue([mockChannel('c1')]);
    (api.getPrimaryChannel as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannel('c1'));

    renderHook(() => useChannels('Fashion'));

    await vi.waitFor(() => {
      expect(api.getRail).toHaveBeenCalledWith('Fashion');
    });
  });

  it('refresh re-fetches channels', async () => {
    (api.getRail as ReturnType<typeof vi.fn>).mockResolvedValue([mockChannel('c1')]);
    (api.getPrimaryChannel as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannel('c1'));

    const { result } = renderHook(() => useChannels());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getRail).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    await vi.waitFor(() => {
      expect(api.getRail).toHaveBeenCalledTimes(2);
    });
  });
});
