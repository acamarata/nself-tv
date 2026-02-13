import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QualityToast } from '@/components/player/QualityToast';
import type { QualityToast as QualityToastData } from '@/hooks/useQualityMonitor';

function makeToast(overrides: Partial<QualityToastData> = {}): QualityToastData {
  return {
    type: 'downgrade',
    message: 'Quality reduced to 480p',
    level: '480p',
    ...overrides,
  };
}

describe('QualityToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when toast is null', () => {
    const { container } = render(
      <QualityToast toast={null} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the toast message', () => {
    const toast = makeToast({ message: 'Quality reduced to 480p' });
    const { getByText } = render(
      <QualityToast toast={toast} onDismiss={vi.fn()} />,
    );
    expect(getByText('Quality reduced to 480p')).toBeDefined();
  });

  it('renders a downgrade icon for downgrade type', () => {
    const toast = makeToast({ type: 'downgrade' });
    const { container } = render(
      <QualityToast toast={toast} onDismiss={vi.fn()} />,
    );
    // ChevronDown icon has text-yellow-400 color class
    const icon = container.querySelector('.text-yellow-400');
    expect(icon).not.toBeNull();
  });

  it('renders a recovery icon for recovery type', () => {
    const toast = makeToast({ type: 'recovery' });
    const { container } = render(
      <QualityToast toast={toast} onDismiss={vi.fn()} />,
    );
    // ChevronUp icon has text-green-400 color class
    const icon = container.querySelector('.text-green-400');
    expect(icon).not.toBeNull();
  });

  it('renders a sustained-low icon for sustained-low type', () => {
    const toast = makeToast({ type: 'sustained-low' });
    const { container } = render(
      <QualityToast toast={toast} onDismiss={vi.fn()} />,
    );
    // AlertTriangle icon has text-red-400 color class
    const icon = container.querySelector('.text-red-400');
    expect(icon).not.toBeNull();
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    const toast = makeToast();
    const { getByLabelText } = render(
      <QualityToast toast={toast} onDismiss={onDismiss} />,
    );
    fireEvent.click(getByLabelText('Dismiss notification'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = vi.fn();
    const toast = makeToast();
    render(<QualityToast toast={toast} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not auto-dismiss before 5 seconds', () => {
    const onDismiss = vi.fn();
    const toast = makeToast();
    render(<QualityToast toast={toast} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(4999);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('clears previous timer when toast changes', () => {
    const onDismiss = vi.fn();
    const toast1 = makeToast({ message: 'First toast' });
    const toast2 = makeToast({ message: 'Second toast' });

    const { rerender } = render(
      <QualityToast toast={toast1} onDismiss={onDismiss} />,
    );

    vi.advanceTimersByTime(3000);

    rerender(<QualityToast toast={toast2} onDismiss={onDismiss} />);

    // After another 3000ms (6000ms total), first timer would have fired
    // but it was cleared, so onDismiss should NOT have been called yet
    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();

    // After the full 5000ms from second toast, it should fire
    vi.advanceTimersByTime(2000);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has role="status" for accessibility', () => {
    const toast = makeToast();
    const { getByRole } = render(
      <QualityToast toast={toast} onDismiss={vi.fn()} />,
    );
    expect(getByRole('status')).toBeDefined();
  });
});
