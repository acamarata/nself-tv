import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubscriptionsPage from '@/app/(app)/acquire/subscriptions/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock QualityProfileSelector component
vi.mock('@/components/acquire/QualityProfileSelector', () => ({
  QualityProfileSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="quality-profile-selector" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="minimal">Minimal</option>
      <option value="balanced">Balanced</option>
      <option value="4k_premium">4K Premium</option>
    </select>
  ),
}));

describe('SubscriptionsPage', () => {
  it('renders the TV Subscriptions heading', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('TV Subscriptions')).toBeDefined();
  });

  it('renders the Add Subscription button', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('Add Subscription')).toBeDefined();
  });

  it('renders subscription table with all mock entries', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByTestId('sub-row-s1')).toBeDefined();
    expect(screen.getByTestId('sub-row-s2')).toBeDefined();
    expect(screen.getByTestId('sub-row-s3')).toBeDefined();
    expect(screen.getByTestId('sub-row-s4')).toBeDefined();
  });

  it('renders show names in the table', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('Breaking Bad')).toBeDefined();
    expect(screen.getByText('The Bear')).toBeDefined();
    expect(screen.getByText('Severance')).toBeDefined();
    expect(screen.getByText('Andor')).toBeDefined();
  });

  it('renders table column headers', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('Show')).toBeDefined();
    expect(screen.getByText('Quality')).toBeDefined();
    expect(screen.getByText('Episodes')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Auto')).toBeDefined();
    expect(screen.getByText('Last Check')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders status badges for subscriptions', () => {
    render(<SubscriptionsPage />);
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('dormant')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('renders episode counts', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('62')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined();
    expect(screen.getByText('19')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('renders delete buttons for each subscription', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByLabelText('Delete Breaking Bad')).toBeDefined();
    expect(screen.getByLabelText('Delete The Bear')).toBeDefined();
    expect(screen.getByLabelText('Delete Severance')).toBeDefined();
    expect(screen.getByLabelText('Delete Andor')).toBeDefined();
  });

  it('does not show the form by default', () => {
    render(<SubscriptionsPage />);
    expect(screen.queryByText('New Subscription')).toBeNull();
  });

  it('shows the form when Add Subscription is clicked', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));
    expect(screen.getByText('New Subscription')).toBeDefined();
    expect(screen.getByLabelText('Show Name')).toBeDefined();
    expect(screen.getByLabelText('Feed URL')).toBeDefined();
    expect(screen.getByLabelText('Auto-download new episodes')).toBeDefined();
  });

  it('hides the form when Cancel is clicked', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));
    expect(screen.getByText('New Subscription')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Subscription')).toBeNull();
  });

  it('toggles the form on repeated Add Subscription clicks', () => {
    render(<SubscriptionsPage />);
    const addBtn = screen.getByText('Add Subscription');

    fireEvent.click(addBtn);
    expect(screen.getByText('New Subscription')).toBeDefined();

    fireEvent.click(addBtn);
    expect(screen.queryByText('New Subscription')).toBeNull();
  });

  it('renders the Subscribe button inside the form', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDefined();
  });

  it('allows typing in the Show Name input', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));

    const input = screen.getByLabelText('Show Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Stranger Things' } });
    expect(input.value).toBe('Stranger Things');
  });

  it('allows typing in the Feed URL input', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));

    const input = screen.getByLabelText('Feed URL') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://showrss.info/show/999' } });
    expect(input.value).toBe('https://showrss.info/show/999');
  });

  it('submits the form and hides it', () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText('Add Subscription'));

    const showInput = screen.getByLabelText('Show Name') as HTMLInputElement;
    const urlInput = screen.getByLabelText('Feed URL') as HTMLInputElement;
    fireEvent.change(showInput, { target: { value: 'Test Show' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com/rss' } });

    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(screen.queryByText('New Subscription')).toBeNull();
  });

  it('renders quality profiles in the table', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText('4k premium')).toBeDefined();
    const balancedCells = screen.getAllByText('balanced');
    expect(balancedCells.length).toBeGreaterThanOrEqual(2);
  });
});
