'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

type Theme = 'light' | 'dark' | 'system';

const themeOrder: Theme[] = ['light', 'dark', 'system'];

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-5 w-5" />,
  dark: <Moon className="h-5 w-5" />,
  system: <Monitor className="h-5 w-5" />,
};

const themeLabels: Record<Theme, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};

function ThemeToggle() {
  const { colorScheme, setColorScheme } = useTheme();

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(colorScheme as Theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setColorScheme(themeOrder[nextIndex]);
  };

  const currentTheme = (colorScheme as Theme) || 'system';

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
      aria-label={themeLabels[currentTheme]}
      title={themeLabels[currentTheme]}
    >
      {themeIcons[currentTheme]}
    </button>
  );
}

export { ThemeToggle };
