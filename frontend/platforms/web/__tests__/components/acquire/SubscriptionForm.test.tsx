import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SubscriptionForm } from '@/components/acquire/SubscriptionForm';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

describe('SubscriptionForm', () => {
  const defaultProps = {
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with data-testid', () => {
    const { getByTestId } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByTestId('subscription-form')).toBeDefined();
  });

  it('renders show name input', () => {
    const { getByPlaceholderText } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByPlaceholderText('e.g. Breaking Bad')).toBeDefined();
  });

  it('renders feed URL input', () => {
    const { getByPlaceholderText } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByPlaceholderText('https://showrss.info/show/...')).toBeDefined();
  });

  it('renders quality profile selector', () => {
    const { getByTestId } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByTestId('quality-profile-selector')).toBeDefined();
  });

  it('renders auto-download checkbox (checked by default)', () => {
    const { getByText, container } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByText('Auto-download new episodes')).toBeDefined();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
  });

  it('renders backfill checkbox (unchecked by default)', () => {
    const { getByText, container } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByText('Backfill aired episodes')).toBeDefined();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('renders Subscribe button', () => {
    const { getByText } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByText('Subscribe')).toBeDefined();
  });

  it('renders Cancel button', () => {
    const { getByText } = render(<SubscriptionForm {...defaultProps} />);
    expect(getByText('Cancel')).toBeDefined();
  });

  it('disables submit when show name is empty', () => {
    const { getByText, getByPlaceholderText } = render(<SubscriptionForm {...defaultProps} />);
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://example.com/rss' } });
    const submitBtn = getByText('Subscribe').closest('button')!;
    expect(submitBtn).toBeDisabled();
  });

  it('disables submit when feed URL is empty', () => {
    const { getByText, getByPlaceholderText } = render(<SubscriptionForm {...defaultProps} />);
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'My Show' } });
    const submitBtn = getByText('Subscribe').closest('button')!;
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when both fields are filled', () => {
    const { getByText, getByPlaceholderText } = render(<SubscriptionForm {...defaultProps} />);
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'My Show' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://example.com/rss' } });
    const submitBtn = getByText('Subscribe').closest('button')!;
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with form data on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SubscriptionForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'Breaking Bad' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://showrss.info/show/123' } });

    fireEvent.submit(getByTestId('subscription-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        showName: 'Breaking Bad',
        feedUrl: 'https://showrss.info/show/123',
        qualityProfile: 'balanced',
        autoDownload: true,
        backfill: false,
      });
    });
  });

  it('trims whitespace from inputs before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <SubscriptionForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: '  Breaking Bad  ' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: '  https://example.com  ' } });

    fireEvent.submit(getByTestId('subscription-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          showName: 'Breaking Bad',
          feedUrl: 'https://example.com',
        }),
      );
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    const { getByText } = render(<SubscriptionForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows error message when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <SubscriptionForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'Show' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://example.com' } });

    fireEvent.submit(getByTestId('subscription-form'));

    await waitFor(() => {
      expect(getByText('Network error')).toBeDefined();
    });
  });

  it('shows generic error for non-Error throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue('unknown failure');
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <SubscriptionForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'Show' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://example.com' } });

    fireEvent.submit(getByTestId('subscription-form'));

    await waitFor(() => {
      expect(getByText('Failed to save subscription')).toBeDefined();
    });
  });

  it('shows "Saving..." during submission', async () => {
    let resolve: () => void;
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <SubscriptionForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Breaking Bad'), { target: { value: 'Show' } });
    fireEvent.change(getByPlaceholderText('https://showrss.info/show/...'), { target: { value: 'https://example.com' } });

    fireEvent.submit(getByTestId('subscription-form'));

    await waitFor(() => {
      expect(getByText('Saving...')).toBeDefined();
    });

    resolve!();
    await waitFor(() => {
      expect(getByText('Subscribe')).toBeDefined();
    });
  });

  it('uses initial values when provided', () => {
    const { container, getByPlaceholderText } = render(
      <SubscriptionForm
        {...defaultProps}
        initialValues={{
          showName: 'Preset Show',
          feedUrl: 'https://preset.com/rss',
          qualityProfile: 'minimal',
          autoDownload: false,
          backfill: true,
        }}
      />,
    );
    expect((getByPlaceholderText('e.g. Breaking Bad') as HTMLInputElement).value).toBe('Preset Show');
    expect((getByPlaceholderText('https://showrss.info/show/...') as HTMLInputElement).value).toBe('https://preset.com/rss');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false); // autoDownload
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);  // backfill
  });

  it('toggles autoDownload checkbox', () => {
    const { container } = render(<SubscriptionForm {...defaultProps} />);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const autoDownload = checkboxes[0] as HTMLInputElement;
    expect(autoDownload.checked).toBe(true);
    fireEvent.click(autoDownload);
    expect(autoDownload.checked).toBe(false);
  });

  it('toggles backfill checkbox', () => {
    const { container } = render(<SubscriptionForm {...defaultProps} />);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const backfill = checkboxes[1] as HTMLInputElement;
    expect(backfill.checked).toBe(false);
    fireEvent.click(backfill);
    expect(backfill.checked).toBe(true);
  });
});
