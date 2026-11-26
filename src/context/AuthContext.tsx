import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { request, SESSION_TOKEN } from '../api/rest';
import type { AuthContextValue, AuthSession, AuthUser } from '../types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  // The session is an httpOnly cookie, so ask the server who we are. Only a rejected session ends it;
  // a network blip or a 5xx must not sign anyone out.
  useEffect(() => {
    request<{ user: AuthUser }>('/auth/me')
      .then((json) => setSession({ token: SESSION_TOKEN, user: json.user }))
      .catch((err: Error & { status?: number }) => {
        if (err.status === 401) setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const persist = (data: AuthSession) => setSession({ token: SESSION_TOKEN, user: data.user });

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
    // Revokes every token server-side and clears the cookie.
    request('/auth/logout', { method: 'POST' }).catch(() => {});
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
