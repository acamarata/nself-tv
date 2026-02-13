import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeContext } from '@/lib/theme/ThemeProvider';
import type { ThemeContextValue } from '@/lib/theme/ThemeProvider';
import type { ReactNode } from 'react';

const mockCtx: ThemeContextValue = {
  colorScheme: 'dark',
  resolvedScheme: 'dark',
  setColorScheme: vi.fn(),
};

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={mockCtx}>{children}</ThemeContext.Provider>;
}

describe('useTheme', () => {
  it('returns theme context value', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.colorScheme).toBe('dark');
    expect(result.current.resolvedScheme).toBe('dark');
  });

  it('throws when used outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
  });

  it('provides setColorScheme function', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.setColorScheme).toBe('function');
  });
});
