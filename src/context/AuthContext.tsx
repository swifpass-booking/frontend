import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { request } from '../api/rest';
import type { AuthContextValue, AuthSession, AuthUser } from '../types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'swiftpass.auth';

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
      request<{ user: AuthUser }>('/auth/me', { token })
        .then((json) => setSession({ token, user: json.user }))
        .catch((err: Error & { status?: number }) => {
          // Only a rejected token ends the session; a network blip or a 5xx must not sign anyone out.
          if (err.status === 401) {
            localStorage.removeItem(STORAGE_KEY);
            setSession(null);
          }
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
    const data = await request<AuthSession>('/auth/login', { method: 'POST', body: { identifier, password } });
    persist(data);
    return data.user;
  }, []);

  const register = useCallback(
    async (fullName: string, identifier: string, password: string): Promise<AuthUser> => {
      const data = await request<AuthSession>('/auth/register', { method: 'POST', body: { fullName, identifier, password } });
      persist(data);
      return data.user;
    },
    []
  );

  const logout = useCallback(() => {
    // Revoke server-side too, so a copied token stops working.
    if (session) {
      request('/auth/logout', { method: 'POST', token: session.token }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, [session]);

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
