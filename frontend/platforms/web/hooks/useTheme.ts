'use client';

import { useContext } from 'react';
import { ThemeContext } from '@/lib/theme/ThemeProvider';
import type { ThemeContextValue } from '@/lib/theme/ThemeProvider';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
