import { useEffect, useState, useCallback } from 'react';
import { getToken } from '../services/api';

const WS_BASE = import.meta.env.VITE_WS_URL ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export type WSEvent =
  | 'channel:update'
  | 'rail:update'
  | 'checkout:status'
  | 'viewer:count'
  | 'chat:message'
  | 'heart:burst'
  | 'channel:state'
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
  sendChat: (channelId: string, text: string, user: string) => void;
  sendHeart: (channelId: string, user: string) => void;
  on: (event: WSEvent, listener: Listener) => () => void;
}

// ── Module-level singleton ──────────────────────────────
// All components share ONE WebSocket connection + listener registry.

let _ws: WebSocket | null = null;
let _connected = false;
let _channel = '';
let _retries = 0;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const _listeners = new Map<WSEvent, Set<Listener>>();
const _connectedCallbacks = new Set<(v: boolean) => void>();

const MAX_RETRIES = 20;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

function _notifyConnected(v: boolean) {
  _connected = v;
  _connectedCallbacks.forEach(fn => fn(v));
}

function _dispatch(msg: WSMessage) {
  const set = _listeners.get(msg.event);
  if (set) set.forEach(fn => fn(msg));
}

function _send(data: unknown) {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(data));
  }
}

function _connect() {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;
  if (_retries >= MAX_RETRIES) {
    console.warn('[ws] Max reconnect attempts reached.');
    return;
  }

  const token = getToken();
  const url = token ? `${WS_BASE}/ws?token=${encodeURIComponent(token)}` : `${WS_BASE}/ws`;
  const socket = new WebSocket(url);
  _ws = socket;

  socket.onopen = () => {
    _notifyConnected(true);
    _retries = 0;
    if (_channel) {
      _send({ event: 'subscribe', channel_id: _channel });
    }
  };

  socket.onmessage = (ev) => {
    try {
      const msg: WSMessage = JSON.parse(ev.data);
      _dispatch(msg);
    } catch { /* ignore */ }
  };

  socket.onclose = () => {
    _notifyConnected(false);
    if (_retries < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY * Math.pow(2, _retries), MAX_DELAY) * (0.75 + Math.random() * 0.5);
      _retries++;
      _reconnectTimer = setTimeout(_connect, delay);
    }
  };

  socket.onerror = () => socket.close();
}

// Boot the singleton on first import
_connect();

// ── Public API (stable references) ──────────────────────

function subscribe(channelId: string) {
  _channel = channelId;
  _send({ event: 'subscribe', channel_id: channelId });
}

function sendChat(channelId: string, text: string, user: string) {
  _send({
    event: 'chat:message',
    channel_id: channelId,
    payload: { text, user },
  });
}

function sendHeart(channelId: string, user: string) {
  _send({
    event: 'heart:burst',
    channel_id: channelId,
    payload: { user },
  });
}

function on(event: WSEvent, listener: Listener): () => void {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event)!.add(listener);
  return () => { _listeners.get(event)?.delete(listener); };
}

// ── React hook (thin wrapper for connected state) ───────

export function useWebSocket(): UseWebSocketResult {
  const [connected, setConnected] = useState(_connected);

  useEffect(() => {
    _connectedCallbacks.add(setConnected);
    // Sync in case connection happened before this component mounted
    setConnected(_connected);
    return () => { _connectedCallbacks.delete(setConnected); };
  }, []);

  return {
    connected,
    subscribe: useCallback(subscribe, []),
    sendChat: useCallback(sendChat, []),
    sendHeart: useCallback(sendHeart, []),
    on: useCallback(on, []),
  };
}
