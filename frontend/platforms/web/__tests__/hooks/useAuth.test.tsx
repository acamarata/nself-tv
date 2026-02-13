import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthContext } from '@/lib/auth/AuthProvider';
import type { AuthContextValue } from '@/lib/auth/AuthProvider';
import type { ReactNode } from 'react';

const mockCtx: AuthContextValue = {
  user: { id: 'u1', email: 'test@test.com', displayName: 'Test', avatarUrl: null, defaultRole: 'user', roles: ['user'], createdAt: '2026-01-01' },
  tokens: { accessToken: 'at', refreshToken: 'rt', expiresIn: 900, expiresAt: Date.now() + 900000 },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={mockCtx}>{children}</AuthContext.Provider>;
}

describe('useAuth', () => {
  it('returns auth context value', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('provides login function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.login).toBe('function');
  });

  it('provides register function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.register).toBe('function');
  });

  it('provides logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.logout).toBe('function');
  });

  it('provides forgotPassword function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.forgotPassword).toBe('function');
  });
});
