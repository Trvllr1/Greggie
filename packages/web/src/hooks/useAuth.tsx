import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from '../services/api';

interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  devLoginAs: (role: 'creator' | 'admin') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(!!api.getToken());

  // Restore session from stored token
  useEffect(() => {
    if (!api.getToken()) return;
    api.getMe()
      .then(setUser)
      .catch(() => {
        api.clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await api.register(email, username, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  /** Instant dev-mode login — sets a synthetic user without hitting the backend */
  const devLoginAs = useCallback((role: 'creator' | 'admin') => {
    const synthetic: AuthUser = {
      id: role === 'admin' ? 'dev-admin-001' : 'dev-creator-001',
      username: role === 'admin' ? 'greggie_admin' : 'dev_creator',
      display_name: role === 'admin' ? 'Greggie Admin' : 'Dev Creator',
      email: role === 'admin' ? 'admin@greggie.app' : 'dev-creator@greggie.app',
      avatar_url: '',
      role,
    };
    setUser(synthetic);
    // Set a fake token so isLoggedIn and token guards pass
    api.setToken(`dev-${role}-token`);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isLoggedIn: !!user, devLoginAs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
