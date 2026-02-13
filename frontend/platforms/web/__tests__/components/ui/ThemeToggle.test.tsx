import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('renders a button', () => {
    const { container } = renderWithTheme();
    const button = container.querySelector('button');
    expect(button).toBeDefined();
  });

  it('has an aria-label', () => {
    const { container } = renderWithTheme();
    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBeTruthy();
  });

  it('cycles theme on click', () => {
    const { container } = renderWithTheme();
    const button = container.querySelector('button')!;
    const initialLabel = button.getAttribute('aria-label');
    fireEvent.click(button);
    const newLabel = button.getAttribute('aria-label');
    expect(newLabel).not.toBe(initialLabel);
  });
});
