import { useCallback } from 'react';
import * as api from '../services/api';

type TrackableEvent =
  | 'view_start'
  | 'view_end'
  | 'channel_switch'
  | 'purchase'
  | 'add_to_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'follow'
  | 'unfollow'
  | 'gift_sent';

/**
 * Fire-and-forget analytics event tracker.
 * Only sends to backend when user is authenticated; silently no-ops otherwise.
 */
export function useTrackEvent() {
  return useCallback((eventType: TrackableEvent, channelId?: string, payload?: Record<string, unknown>) => {
    if (!api.getToken()) return; // not logged in, skip

    // Fire and forget — don't block UI
    fetch(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/v1/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          channel_id: channelId ?? '',
          payload: payload ? JSON.stringify(payload) : '{}',
        }),
      },
    ).catch(() => {});
  }, []);
}
