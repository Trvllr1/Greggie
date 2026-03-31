import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from '../services/api';

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080';

export type WSEvent =
  | 'channel:update'
  | 'rail:update'
  | 'checkout:status'
  | 'viewer:count'
  | 'chat:message'
  | 'bid:update'
  | 'auction:end';

export interface WSMessage {
  event: WSEvent;
  channel_id?: string;
  payload: unknown;
}

type Listener = (msg: WSMessage) => void;

interface UseWebSocketResult {
  connected: boolean;
  subscribe: (channelId: string) => void;
  sendChat: (channelId: string, text: string) => void;
  on: (event: WSEvent, listener: Listener) => () => void;
}

/**
 * Manages a single WebSocket connection with auto-reconnect.
 * Authenticates via JWT query param. Supports channel subscriptions
 * and event listeners.
 */
export function useWebSocket(): UseWebSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<WSEvent, Set<Listener>>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<string>('');
  const retriesRef = useRef(0);

  const MAX_RETRIES = 20;
  const BASE_DELAY = 1000;  // 1s
  const MAX_DELAY = 30000;  // 30s

  const getBackoffDelay = useCallback(() => {
    const exponential = Math.min(BASE_DELAY * Math.pow(2, retriesRef.current), MAX_DELAY);
    const jitter = exponential * (0.75 + Math.random() * 0.5); // ±25%
    return jitter;
  }, []);

  const connect = useCallback(() => {
    // Don't connect if already open/connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (retriesRef.current >= MAX_RETRIES) {
      console.warn('[ws] Max reconnect attempts reached. Connection lost.');
      return;
    }

    const token = getToken();
    const url = token ? `${WS_BASE}/ws?token=${encodeURIComponent(token)}` : `${WS_BASE}/ws`;

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      retriesRef.current = 0; // Reset backoff on successful connection
      // Re-subscribe to channel if we had one
      if (channelRef.current) {
        socket.send(JSON.stringify({ event: 'subscribe', channel_id: channelRef.current }));
      }
    };

    socket.onmessage = (ev) => {
      try {
        const msg: WSMessage = JSON.parse(ev.data);
        const eventListeners = listenersRef.current.get(msg.event);
        if (eventListeners) {
          eventListeners.forEach(fn => fn(msg));
        }
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (retriesRef.current < MAX_RETRIES) {
        const delay = getBackoffDelay();
        console.log(`[ws] Reconnecting in ${Math.round(delay)}ms (attempt ${retriesRef.current + 1}/${MAX_RETRIES})`);
        retriesRef.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [getBackoffDelay]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((channelId: string) => {
    channelRef.current = channelId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'subscribe', channel_id: channelId }));
    }
  }, []);

  const sendChat = useCallback((channelId: string, text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'chat:message',
        channel_id: channelId,
        payload: JSON.stringify({ text }),
      }));
    }
  }, []);

  const on = useCallback((event: WSEvent, listener: Listener): (() => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(listener);
    return () => {
      listenersRef.current.get(event)?.delete(listener);
    };
  }, []);

  return { connected, subscribe, sendChat, on };
}
