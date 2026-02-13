import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('status')).toBeDefined();
  });

  it('renders sm size', () => {
    const { getByRole } = render(<Spinner size="sm" />);
    const spinner = getByRole('status');
    expect(spinner.className).toContain('h-4');
  });

  it('renders lg size', () => {
    const { getByRole } = render(<Spinner size="lg" />);
    const spinner = getByRole('status');
    expect(spinner.className).toContain('h-10');
  });

  it('has accessible status role', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('status')).toBeDefined();
  });

  it('applies custom className', () => {
    const { getByRole } = render(<Spinner className="text-red-500" />);
    expect(getByRole('status').className).toContain('text-red-500');
  });
});
