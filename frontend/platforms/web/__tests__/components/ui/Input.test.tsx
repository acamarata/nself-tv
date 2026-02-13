import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders input element', () => {
    const { getByRole } = render(<Input />);
    expect(getByRole('textbox')).toBeDefined();
  });

  it('renders label when provided', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeDefined();
  });

  it('renders error message when provided', () => {
    const { getByText } = render(<Input error="Required field" />);
    expect(getByText('Required field')).toBeDefined();
  });

  it('applies error styling when error is present', () => {
    const { getByRole } = render(<Input error="Error" />);
    expect(getByRole('textbox').className).toContain('border-error');
  });

  it('handles onChange events', () => {
    const onChange = vi.fn();
    const { getByRole } = render(<Input onChange={onChange} />);
    fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('passes placeholder prop', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter email" />);
    expect(getByPlaceholderText('Enter email')).toBeDefined();
  });

  it('passes disabled prop', () => {
    const { getByRole } = render(<Input disabled />);
    expect(getByRole('textbox')).toBeDisabled();
  });

  it('passes type prop', () => {
    const { container } = render(<Input type="email" />);
    const input = container.querySelector('input');
    expect(input?.getAttribute('type')).toBe('email');
  });
});
