import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMe, MeProfile } from '../backend/ft/repo';
import { getAuthState, loginWith42, logout as logoutSession } from '../backend/auth/user';

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: MeProfile | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  loading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshUser = useCallback(async () => {
    console.info('[42 OAuth] fetching /v2/me');
    const me = await fetchMe();
    console.info('[42 OAuth] fetched /v2/me');
    setUser(me);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const authState = await getAuthState();
      if (!authState) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      setIsAuthenticated(true);
      await refreshUser();
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      await loginWith42();
      setIsAuthenticated(true);
      await refreshUser();
      console.info('[42 OAuth] login completed');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutSession();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, loading, user, login, logout, refreshUser }),
    [isAuthenticated, loading, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
