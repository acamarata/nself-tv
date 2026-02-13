import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider, applyThemeVars, adjustBrightness } from '@/lib/theme/ThemeProvider';
import { ThemeContext } from '@/lib/theme/ThemeProvider';
import { useContext } from 'react';

describe('adjustBrightness', () => {
  it('darkens a color with negative percent', () => {
    const result = adjustBrightness('#ffffff', -10);
    // ff (255) - 25.5 = 229.5, rounded to 230 = e6
    expect(result).toBe('#e6e6e6');
  });

  it('lightens a color with positive percent', () => {
    const result = adjustBrightness('#000000', 10);
    // 0 + 25.5 ≈ 26 = 1a
    expect(result).toBe('#1a1a1a');
  });

  it('clamps to 255 max', () => {
    const result = adjustBrightness('#ffffff', 50);
    expect(result).toBe('#ffffff');
  });

  it('clamps to 0 min', () => {
    const result = adjustBrightness('#000000', -50);
    expect(result).toBe('#000000');
  });

  it('handles mid-range color', () => {
    const result = adjustBrightness('#808080', 0);
    expect(result).toBe('#808080');
  });
});

describe('applyThemeVars', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    document.documentElement.classList.remove('dark', 'light');
  });

  it('applies dark theme variables', () => {
    applyThemeVars(null, 'dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--background')).toBe('#0f172a');
    expect(root.style.getPropertyValue('--text-primary')).toBe('#f8fafc');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
  });

  it('applies light theme variables', () => {
    applyThemeVars(null, 'light');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--background')).toBe('#ffffff');
    expect(root.style.getPropertyValue('--text-primary')).toBe('#0f172a');
    expect(root.classList.contains('light')).toBe(true);
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('applies branding colors when provided', () => {
    applyThemeVars(
      {
        appName: 'test',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        accentColor: '#0000ff',
        logoUrl: null,
        faviconUrl: null,
      },
      'dark',
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--secondary')).toBe('#00ff00');
    expect(root.style.getPropertyValue('--accent')).toBe('#0000ff');
  });

  it('applies default colors when no branding', () => {
    applyThemeVars(null, 'dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('#6366f1');
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.cssText = '';
    document.documentElement.classList.remove('dark', 'light');
  });

  function TestConsumer() {
    const ctx = useContext(ThemeContext);
    if (!ctx) return <div>no context</div>;
    return (
      <div>
        <span data-testid="scheme">{ctx.colorScheme}</span>
        <span data-testid="resolved">{ctx.resolvedScheme}</span>
        <button data-testid="set-light" onClick={() => ctx.setColorScheme('light')}>set light</button>
        <button data-testid="set-dark" onClick={() => ctx.setColorScheme('dark')}>set dark</button>
      </div>
    );
  }

  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );
    expect(getByText('child')).toBeDefined();
  });

  it('provides default color scheme as system', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('scheme').textContent).toBe('system');
  });

  it('allows setting color scheme', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    act(() => {
      getByTestId('set-light').click();
    });
    expect(getByTestId('scheme').textContent).toBe('light');
    expect(localStorage.getItem('ntv_color_scheme')).toBe('light');
  });

  it('persists color scheme in localStorage', () => {
    localStorage.setItem('ntv_color_scheme', 'dark');
    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(getByTestId('scheme').textContent).toBe('dark');
  });
});
