'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, AuthTokens, LoginCredentials, RegisterData, User } from '@/types/auth';
import * as authApi from './api';

const TOKEN_KEY = 'ntv_tokens';
const USER_KEY = 'ntv_user';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function loadTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuth(user: User, tokens: AuthTokens): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearAuth(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((currentTokens: AuthTokens) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const timeUntilExpiry = currentTokens.expiresAt - Date.now();
    const refreshIn = Math.max(timeUntilExpiry - REFRESH_MARGIN_MS, 1000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const newTokens = await authApi.refreshToken(currentTokens.refreshToken);
        setTokens(newTokens);
        const currentUser = loadUser();
        if (currentUser) {
          saveAuth(currentUser, newTokens);
        }
        scheduleRefresh(newTokens);
      } catch {
        setUser(null);
        setTokens(null);
        clearAuth();
      }
    }, refreshIn);
  }, []);

  useEffect(() => {
    const storedTokens = loadTokens();
    const storedUser = loadUser();
    if (storedTokens && storedUser) {
      if (storedTokens.expiresAt > Date.now()) {
        setUser(storedUser);
        setTokens(storedTokens);
        scheduleRefresh(storedTokens);
      } else {
        authApi.refreshToken(storedTokens.refreshToken)
          .then((newTokens) => {
            setUser(storedUser);
            setTokens(newTokens);
            saveAuth(storedUser, newTokens);
            scheduleRefresh(newTokens);
          })
          .catch(() => {
            clearAuth();
          });
      }
    }
    setIsLoading(false);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const loginFn = useCallback(async (credentials: LoginCredentials) => {
    const result = await authApi.login(credentials);
    setUser(result.user);
    setTokens(result.tokens);
    saveAuth(result.user, result.tokens);
    scheduleRefresh(result.tokens);
  }, [scheduleRefresh]);

  const registerFn = useCallback(async (data: RegisterData) => {
    const result = await authApi.register(data);
    setUser(result.user);
    setTokens(result.tokens);
    saveAuth(result.user, result.tokens);
    scheduleRefresh(result.tokens);
  }, [scheduleRefresh]);

  const logoutFn = useCallback(async () => {
    if (tokens?.refreshToken) {
      await authApi.logout(tokens.refreshToken).catch(() => {});
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
    setTokens(null);
    clearAuth();
  }, [tokens]);

  const forgotPasswordFn = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    forgotPassword: forgotPasswordFn,
  }), [user, tokens, isLoading, loginFn, registerFn, logoutFn, forgotPasswordFn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
