import { useState, useEffect, useRef } from 'react';
import { getApiClient } from './useApi';
import type { User } from '@greggie/core';

interface UseAutoAuthResult {
  user: User | null;
  ready: boolean;
}

export function useAutoAuth(): UseAutoAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const client = getApiClient();

    // Already authenticated
    if (client.getToken()) {
      client
        .getMe()
        .then((u) => { if (mounted.current) setUser(u); })
        .catch(() => {})
        .finally(() => { if (mounted.current) setReady(true); });
      return;
    }

    // Auto dev-login for local development
    client
      .devLogin()
      .then(({ token, user: u }) => {
        client.setToken(token);
        if (mounted.current) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setReady(true);
      });

    return () => { mounted.current = false; };
  }, []);

  return { user, ready };
}
