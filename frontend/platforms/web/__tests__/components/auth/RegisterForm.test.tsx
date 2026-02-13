import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import RegisterForm from '@/components/auth/RegisterForm';

describe('RegisterForm', () => {
  it('renders all fields', () => {
    const { getByLabelText } = render(
      <RegisterForm onSubmit={vi.fn()} isLoading={false} error={null} />,
    );
    expect(getByLabelText('Display Name')).toBeDefined();
    expect(getByLabelText('Family Name')).toBeDefined();
    expect(getByLabelText('Email')).toBeDefined();
    expect(getByLabelText('Password')).toBeDefined();
    expect(getByLabelText('Confirm Password')).toBeDefined();
  });

  it('renders submit button', () => {
    const { getByText } = render(
      <RegisterForm onSubmit={vi.fn()} isLoading={false} error={null} />,
    );
    expect(getByText('Create account')).toBeDefined();
  });

  it('shows loading state', () => {
    const { getByText } = render(
      <RegisterForm onSubmit={vi.fn()} isLoading={true} error={null} />,
    );
    expect(getByText('Creating account...')).toBeDefined();
  });

  it('shows error message', () => {
    const { getByText } = render(
      <RegisterForm onSubmit={vi.fn()} isLoading={false} error="Email taken" />,
    );
    expect(getByText('Email taken')).toBeDefined();
  });

  it('validates required fields', async () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <RegisterForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.click(getByText('Create account'));
    await waitFor(() => {
      expect(getByText('Email is required')).toBeDefined();
      expect(getByText('Display name is required')).toBeDefined();
      expect(getByText('Family name is required')).toBeDefined();
      expect(getByText('Password is required')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates password minimum length', async () => {
    const onSubmit = vi.fn();
    const { getByLabelText, getByText } = render(
      <RegisterForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getByLabelText('Family Name'), { target: { value: 'Doe' } });
    fireEvent.change(getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'short' } });
    fireEvent.click(getByText('Create account'));
    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates password confirmation match', async () => {
    const onSubmit = vi.fn();
    const { getByLabelText, getByText } = render(
      <RegisterForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getByLabelText('Family Name'), { target: { value: 'Doe' } });
    fireEvent.change(getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'different' } });
    fireEvent.click(getByText('Create account'));
    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = render(
      <RegisterForm onSubmit={onSubmit} isLoading={false} error={null} />,
    );
    fireEvent.change(getByLabelText('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getByLabelText('Family Name'), { target: { value: 'Doe' } });
    fireEvent.change(getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('Create account'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'john@test.com',
        password: 'password123',
        displayName: 'John',
        familyName: 'Doe',
      });
    });
  });
});
