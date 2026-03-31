import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setToken, clearToken, getToken } from '../api';

// Minimal localStorage stub for vitest/jsdom
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  length: 0,
  key: () => null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('Token management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearToken();
  });

  it('setToken stores and retrieves the token', () => {
    setToken('abc-123');
    expect(getToken()).toBe('abc-123');
    expect(localStorageMock.getItem('greggie_token')).toBe('abc-123');
  });

  it('clearToken removes the token', () => {
    setToken('xyz');
    clearToken();
    expect(getToken()).toBeNull();
    expect(localStorageMock.getItem('greggie_token')).toBeNull();
  });

  it('getToken returns null when no token set', () => {
    expect(getToken()).toBeNull();
  });
});

describe('apiFetch (via healthCheck)', () => {
  beforeEach(() => {
    clearToken();
    vi.restoreAllMocks();
  });

  it('healthCheck calls the correct endpoint', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const { healthCheck } = await import('../api');
    const result = await healthCheck();
    expect(result).toEqual({ status: 'ok' });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/health');
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad request' }), { status: 400 }),
    );

    const { healthCheck } = await import('../api');
    await expect(healthCheck()).rejects.toThrow('bad request');
  });

  it('includes auth header when token is set', async () => {
    setToken('my-jwt');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const { healthCheck } = await import('../api');
    await healthCheck();

    const opts = spy.mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-jwt');
  });
});
