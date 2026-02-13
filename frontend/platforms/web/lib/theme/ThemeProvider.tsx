'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ColorScheme, ServerBranding } from '@/types/config';

const COLOR_SCHEME_KEY = 'ntv_color_scheme';

export interface ThemeContextValue {
  colorScheme: ColorScheme;
  resolvedScheme: 'light' | 'dark';
  setColorScheme: (scheme: ColorScheme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const LIGHT_VARS: Record<string, string> = {
  '--background': '#ffffff',
  '--surface': '#f8fafc',
  '--surface-hover': '#f1f5f9',
  '--border': '#e2e8f0',
  '--text-primary': '#0f172a',
  '--text-secondary': '#475569',
  '--text-muted': '#94a3b8',
  '--error': '#ef4444',
  '--success': '#22c55e',
  '--warning': '#f59e0b',
};

const DARK_VARS: Record<string, string> = {
  '--background': '#0f172a',
  '--surface': '#1e293b',
  '--surface-hover': '#334155',
  '--border': '#334155',
  '--text-primary': '#f8fafc',
  '--text-secondary': '#cbd5e1',
  '--text-muted': '#64748b',
  '--error': '#f87171',
  '--success': '#4ade80',
  '--warning': '#fbbf24',
};

function getSystemScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(COLOR_SCHEME_KEY) as ColorScheme) || 'system';
}

export function applyThemeVars(branding?: ServerBranding | null, scheme?: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = scheme === 'dark' ? DARK_VARS : LIGHT_VARS;

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  if (branding) {
    root.style.setProperty('--primary', branding.primaryColor);
    root.style.setProperty('--primary-hover', adjustBrightness(branding.primaryColor, -10));
    root.style.setProperty('--secondary', branding.secondaryColor);
    root.style.setProperty('--accent', branding.accentColor);
  } else {
    root.style.setProperty('--primary', '#6366f1');
    root.style.setProperty('--primary-hover', '#4f46e5');
    root.style.setProperty('--secondary', '#8b5cf6');
    root.style.setProperty('--accent', '#f59e0b');
  }

  if (scheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function ThemeProvider({
  children,
  branding,
}: {
  children: ReactNode;
  branding?: ServerBranding | null;
}) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setColorSchemeState(loadColorScheme());
    setSystemScheme(getSystemScheme());

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedScheme = colorScheme === 'system' ? systemScheme : colorScheme;

  useEffect(() => {
    applyThemeVars(branding, resolvedScheme);
  }, [branding, resolvedScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colorScheme, resolvedScheme, setColorScheme }),
    [colorScheme, resolvedScheme, setColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
