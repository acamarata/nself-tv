import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    const { getByLabelText } = render(
      <LoginForm onSubmit={vi.fn()} isLoading={false} error={null} />,
    );
    expect(getByLabelText('Email')).toBeDefined();
    expect(getByLabelText('Password')).toBeDefined();
  });

  it('renders submit button', () => {
    const { getByText } = render(
      <LoginForm onSubmit={vi.fn()} isLoading={false} error={null} />,
    );
    expect(getByText('Sign in')).toBeDefined();
  });

  it('shows loading state', () => {
    const { getByText } = render(
      <LoginForm onSubmit={vi.fn()} isLoading={true} error={null} />,
    );
    expect(getByText('Signing in...')).toBeDefined();
  });

  it('shows error message', () => {
    const { getByText } = render(
      <LoginForm onSubmit={vi.fn()} isLoading={false} error="Invalid credentials" />,
    );
    expect(getByText('Invalid credentials')).toBeDefined();
  });

  it('validates empty email', async () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <LoginForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.click(getByText('Sign in'));
    await waitFor(() => {
      expect(getByText('Email is required')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates empty password', async () => {
    const onSubmit = vi.fn();
    const { getByLabelText, getByText } = render(
      <LoginForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Email'), { target: { value: 'test@test.com' } });
    fireEvent.click(getByText('Sign in'));
    await waitFor(() => {
      expect(getByText('Password is required')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = render(
      <LoginForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Email'), { target: { value: 'test@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('Sign in'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('validates invalid email format', async () => {
    const onSubmit = vi.fn();
    const { getByLabelText, getByText } = render(
      <LoginForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('Sign in'));
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
