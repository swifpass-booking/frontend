import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'swiftpass.auth';

async function api(path, body) {
  const res = await fetch(`/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Something went wrong. Try again.');
  }
  return json;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setReady(true);
      return;
    }
    try {
      const { token, user } = JSON.parse(raw);
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

  const persist = (data) => {
    setSession(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const login = useCallback(async (identifier, password) => {
    const data = await api('/auth/login', { identifier, password });
    persist(data);
    return data.user;
  }, []);

  const register = useCallback(async (fullName, identifier, password) => {
    const data = await api('/auth/register', { fullName, identifier, password });
    persist(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
