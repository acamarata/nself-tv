import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ErrorOverlay } from '@/components/player/ErrorOverlay';
import type { PlayerError } from '@/lib/player/error-handler';
import { ErrorSeverity } from '@/lib/player/error-handler';

function makeError(overrides: Partial<PlayerError> = {}): PlayerError {
  return {
    type: 'networkError',
    severity: ErrorSeverity.RECOVERABLE,
    message: 'Video segment failed to load',
    retryable: true,
    ...overrides,
  };
}

describe('ErrorOverlay', () => {
  it('returns null when error is null', () => {
    const { container } = render(
      <ErrorOverlay error={null} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the error message', () => {
    const error = makeError({ message: 'Something went wrong' });
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(getByText('Something went wrong')).toBeDefined();
  });

  it('renders the "Playback Error" heading', () => {
    const error = makeError();
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(getByText('Playback Error')).toBeDefined();
  });

  it('renders the retry button when error is retryable', () => {
    const error = makeError({ retryable: true });
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(getByText('Retry')).toBeDefined();
  });

  it('does NOT render the retry button when error is not retryable', () => {
    const error = makeError({ retryable: false });
    const { queryByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(queryByText('Retry')).toBeNull();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    const error = makeError({ retryable: true });
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={vi.fn()} />,
    );
    fireEvent.click(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    const error = makeError();
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={onDismiss} />,
    );
    fireEvent.click(getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('always renders the dismiss button', () => {
    const error = makeError({ retryable: false });
    const { getByText } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(getByText('Dismiss')).toBeDefined();
  });

  it('has role="alert" for accessibility', () => {
    const error = makeError();
    const { getByRole } = render(
      <ErrorOverlay error={error} onRetry={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(getByRole('alert')).toBeDefined();
  });
});
