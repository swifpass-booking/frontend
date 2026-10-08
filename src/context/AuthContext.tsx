import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthContextValue, AuthSession, AuthUser } from '../types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'swiftpass.auth';

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Something went wrong. Try again.');
  }
  return json as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setReady(true);
      return;
    }
    try {
      const { token, user } = JSON.parse(raw) as AuthSession;
      fetch('/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((json) => setSession({ token, user: json.user }))
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
        })
        .finally(() => setReady(true));
      setSession({ token, user });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setReady(true);
    }
  }, []);

  const persist = (data: AuthSession) => {
    setSession(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    const data = await api<AuthSession>('/auth/login', { identifier, password });
    persist(data);
    return data.user;
  }, []);

  const register = useCallback(
    async (fullName: string, identifier: string, password: string): Promise<AuthUser> => {
      const data = await api<AuthSession>('/auth/register', { fullName, identifier, password });
      persist(data);
      return data.user;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    token: session?.token ?? null,
    ready,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
