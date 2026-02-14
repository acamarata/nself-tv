'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, AuthTokens, LoginCredentials, RegisterData, User } from '@/types/auth';
import * as authApi from './api';

const REFRESH_TOKEN_KEY = 'ntv_refresh_token';
const USER_KEY = 'ntv_user';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

// SECURITY: Store access token in memory only (not localStorage/sessionStorage)
// This prevents XSS attacks from stealing the token
let accessTokenMemory: string | null = null;
let accessTokenExpiresAt: number | null = null;

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Get access token from memory.
 * Returns null if not set or expired.
 */
export function getAccessToken(): string | null {
  if (!accessTokenMemory || !accessTokenExpiresAt) return null;
  if (accessTokenExpiresAt <= Date.now()) return null;
  return accessTokenMemory;
}

function loadRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function loadUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuth(user: User, tokens: AuthTokens): void {
  // Access token stored in memory only
  accessTokenMemory = tokens.accessToken;
  accessTokenExpiresAt = tokens.expiresAt;

  // Refresh token and user in sessionStorage (cleared on tab close)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearAuth(): void {
  // Clear memory
  accessTokenMemory = null;
  accessTokenExpiresAt = null;

  // Clear sessionStorage
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
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
    // Silent refresh: Attempt to restore session using refresh token
    const storedRefreshToken = loadRefreshToken();
    const storedUser = loadUser();

    if (storedRefreshToken && storedUser) {
      // Try to get new access token using refresh token
      authApi.refreshToken(storedRefreshToken)
        .then((newTokens) => {
          setUser(storedUser);
          setTokens(newTokens);
          saveAuth(storedUser, newTokens);
          scheduleRefresh(newTokens);
        })
        .catch(() => {
          // Refresh token expired or invalid - clear auth
          clearAuth();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    // Clear tokens on tab/window close for security
    const handleBeforeUnload = () => {
      clearAuth();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
