'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getSessionStart,
  setSessionStart,
  setOnUnauthorized,
  type AuthUser,
  type LoginResponse,
  type RefreshResponse,
  type RegisterResponse,
} from '@/lib/api-client';

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(null);
  }, [logout]);

  const MAX_SESSION_MS = 3 * 60 * 60 * 1000; // 3 hours
  const REFRESH_BUFFER_MS = 60_000; // refresh 60s before access token expires

  const scheduleTokenLifecycle = useCallback((token: string) => {
    const sessionStart = getSessionStart();
    if (!sessionStart) return;

    const sessionEnd = sessionStart + MAX_SESSION_MS;
    const now = Date.now();

    if (now >= sessionEnd) {
      logout();
      return;
    }

    const sessionTimeoutId = window.setTimeout(logout, sessionEnd - now);

    const exp = getTokenExpiry(token);
    let refreshTimeoutId: number | undefined;

    if (exp) {
      const refreshAt = exp - REFRESH_BUFFER_MS;
      const refreshMs = refreshAt - now;

      if (refreshMs > 0 && refreshAt < sessionEnd) {
        refreshTimeoutId = window.setTimeout(async () => {
          const rt = getRefreshToken();
          if (!rt) { logout(); return; }
          try {
            const res = await api.post<RefreshResponse>(
              '/auth/refresh',
              { refreshToken: rt },
              { skipAuth: true },
            );
            setAccessToken(res.accessToken);
            setRefreshToken(res.refreshToken);
            scheduleTokenLifecycle(res.accessToken);
          } catch {
            logout();
          }
        }, refreshMs);
      }
    }

    return () => {
      window.clearTimeout(sessionTimeoutId);
      if (refreshTimeoutId) window.clearTimeout(refreshTimeoutId);
    };
  }, [logout]);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const sessionStart = getSessionStart();
    if (sessionStart && Date.now() >= sessionStart + MAX_SESSION_MS) {
      logout();
      setLoading(false);
      return;
    }

    const exp = getTokenExpiry(token);
    if (exp && exp <= Date.now()) {
      const rt = getRefreshToken();
      if (rt && sessionStart && Date.now() < sessionStart + MAX_SESSION_MS) {
        try {
          const res = await api.post<RefreshResponse>(
            '/auth/refresh',
            { refreshToken: rt },
            { skipAuth: true },
          );
          setAccessToken(res.accessToken);
          setRefreshToken(res.refreshToken);
          const me = await api.get<AuthUser>('/auth/me');
          setUser(me);
          scheduleTokenLifecycle(res.accessToken);
          setLoading(false);
          return;
        } catch {
          /* fall through to logout */
        }
      }
      logout();
      setLoading(false);
      return;
    }

    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
      scheduleTokenLifecycle(token);
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [logout, scheduleTokenLifecycle]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setSessionStart(Date.now());
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      companyName: string;
    }) => {
      const res = await api.post<RegisterResponse>('/auth/register', data, { skipAuth: true });
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setSessionStart(Date.now());
      await refreshUser();
    },
    [refreshUser],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
