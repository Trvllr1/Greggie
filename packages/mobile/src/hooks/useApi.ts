import { useRef, useCallback } from 'react';
import { ApiClient } from '@greggie/core';
import { API_BASE_URL } from '../config';

// Singleton API client
let _client: ApiClient | null = null;

function getClient(): ApiClient {
  if (!_client) {
    _client = new ApiClient(API_BASE_URL);
  }
  return _client;
}

export function useApi() {
  const client = useRef(getClient()).current;
  return client;
}

export { getClient as getApiClient };
