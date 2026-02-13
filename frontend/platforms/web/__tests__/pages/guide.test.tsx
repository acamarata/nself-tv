import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import GuidePage from '@/app/(app)/guide/page';

// Mock useAuth for the admin layout
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@nself.org' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('GuidePage', () => {
  it('renders the Channel Guide heading', () => {
    const { getByText } = render(<GuidePage />);
    expect(getByText('Channel Guide')).toBeDefined();
  });

  it('renders the EPG grid', () => {
    const { getByTestId } = render(<GuidePage />);
    expect(getByTestId('epg-grid')).toBeDefined();
  });

  it('renders the genre filter dropdown', () => {
    const { getByLabelText } = render(<GuidePage />);
    expect(getByLabelText('Filter by genre')).toBeDefined();
  });

  it('renders the Now button', () => {
    const { getByLabelText } = render(<GuidePage />);
    expect(getByLabelText('Scroll to current time')).toBeDefined();
  });

  it('filters channels by genre', () => {
    const { getByLabelText, getByTestId, queryByTestId } = render(<GuidePage />);
    const select = getByLabelText('Filter by genre') as HTMLSelectElement;

    // Filter to Sports only
    fireEvent.change(select, { target: { value: 'Sports' } });

    // WPIX (ch-11) is Sports, should be visible
    expect(getByTestId('channel-ch-11')).toBeDefined();
    // WCBS (ch-2) is News, should not be visible
    expect(queryByTestId('channel-ch-2')).toBeNull();
  });

  it('shows all channels when genre filter is All', () => {
    const { getByLabelText, getByTestId } = render(<GuidePage />);
    const select = getByLabelText('Filter by genre') as HTMLSelectElement;

    // First filter to something
    fireEvent.change(select, { target: { value: 'News' } });
    // Then back to all
    fireEvent.change(select, { target: { value: 'All' } });

    expect(getByTestId('channel-ch-2')).toBeDefined();
    expect(getByTestId('channel-ch-11')).toBeDefined();
  });

  it('opens program modal when clicking a program', () => {
    const { getAllByTestId, queryByTestId } = render(<GuidePage />);

    // Initially no modal
    expect(queryByTestId('program-modal')).toBeNull();

    // Find any program and click it
    const programs = getAllByTestId(/^program-prog-/);
    fireEvent.click(programs[0]);

    // Modal should appear
    expect(queryByTestId('program-modal')).toBeDefined();
  });

  it('closes program modal when close is clicked', () => {
    const { getAllByTestId, queryByTestId, getByLabelText } = render(<GuidePage />);

    // Open modal
    const programs = getAllByTestId(/^program-prog-/);
    fireEvent.click(programs[0]);
    expect(queryByTestId('program-modal')).toBeDefined();

    // Close modal
    fireEvent.click(getByLabelText('Close'));
    expect(queryByTestId('program-modal')).toBeNull();
  });

  it('contains genre options in the filter', () => {
    const { getByLabelText } = render(<GuidePage />);
    const select = getByLabelText('Filter by genre') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('All');
    expect(options).toContain('News');
    expect(options).toContain('Sports');
  });
});
