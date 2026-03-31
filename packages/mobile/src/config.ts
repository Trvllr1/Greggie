import Constants from 'expo-constants';

// Use the Expo debugger host (set automatically by Metro) when available,
// otherwise fall back to localhost for emulators / manual override.
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const devBackendUrl = debuggerHost
  ? `http://${debuggerHost}:8080`
  : 'http://localhost:8080';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ?? devBackendUrl;
