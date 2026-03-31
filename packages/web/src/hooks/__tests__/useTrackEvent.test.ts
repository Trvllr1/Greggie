import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api', () => ({
  getToken: vi.fn(),
}));

import * as api from '../../services/api';
import { useTrackEvent } from '../useTrackEvent';
import { renderHook } from '@testing-library/react';

describe('useTrackEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when user is not authed', () => {
    (api.getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const spy = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() => useTrackEvent());
    result.current('view_start', 'ch-1');

    expect(spy).not.toHaveBeenCalled();
  });

  it('fires POST to /events when authed', () => {
    (api.getToken as ReturnType<typeof vi.fn>).mockReturnValue('jwt-tok');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

    const { result } = renderHook(() => useTrackEvent());
    result.current('purchase', 'ch-2', { amount: 100 });

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toContain('/api/v1/events');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string);
    expect(body.event_type).toBe('purchase');
    expect(body.channel_id).toBe('ch-2');
  });

  it('sets channel_id to empty string when omitted', () => {
    (api.getToken as ReturnType<typeof vi.fn>).mockReturnValue('jwt');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

    const { result } = renderHook(() => useTrackEvent());
    result.current('view_start');

    const body = JSON.parse((spy.mock.calls[0][1].body) as string);
    expect(body.channel_id).toBe('');
  });
});
