import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeDefined();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    const { getByText } = render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies primary variant by default', () => {
    const { getByRole } = render(<Button>Primary</Button>);
    const btn = getByRole('button');
    expect(btn.className).toContain('bg-primary');
  });

  it('applies secondary variant', () => {
    const { getByRole } = render(<Button variant="secondary">Secondary</Button>);
    expect(getByRole('button').className).toContain('border');
  });

  it('applies ghost variant', () => {
    const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
    expect(getByRole('button').className).toContain('hover:bg-surface');
  });

  it('applies danger variant', () => {
    const { getByRole } = render(<Button variant="danger">Danger</Button>);
    expect(getByRole('button').className).toContain('bg-error');
  });

  it('applies sm size', () => {
    const { getByRole } = render(<Button size="sm">Small</Button>);
    expect(getByRole('button').className).toContain('text-sm');
  });

  it('applies lg size', () => {
    const { getByRole } = render(<Button size="lg">Large</Button>);
    expect(getByRole('button').className).toContain('text-lg');
  });

  it('disables button when disabled prop is true', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button disabled onClick={onClick}>Disabled</Button>);
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const { getByRole } = render(<Button isLoading>Loading</Button>);
    const btn = getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('passes additional HTML attributes', () => {
    const { getByRole } = render(<Button type="submit" data-testid="test">Submit</Button>);
    const btn = getByRole('button');
    expect(btn.getAttribute('type')).toBe('submit');
    expect(btn.getAttribute('data-testid')).toBe('test');
  });
});
