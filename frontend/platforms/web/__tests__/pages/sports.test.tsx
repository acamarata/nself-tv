import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SportsPage from '@/app/(app)/sports/page';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@nself.org' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('SportsPage', () => {
  it('renders the Sports heading', () => {
    const { getByText } = render(<SportsPage />);
    expect(getByText('Sports')).toBeDefined();
  });

  it('renders the Your Teams section', () => {
    const { getByText } = render(<SportsPage />);
    expect(getByText('Your Teams')).toBeDefined();
  });

  it('shows favorite team events', () => {
    const { getByTestId } = render(<SportsPage />);
    expect(getByTestId('favorite-events')).toBeDefined();
  });

  it('renders the Live Now tab as active by default', () => {
    const { getByTestId } = render(<SportsPage />);
    const liveTab = getByTestId('tab-live');
    expect(liveTab.className).toContain('border-primary');
  });

  it('shows live events by default', () => {
    const { getAllByText } = render(<SportsPage />);
    // Eagles vs Cowboys is a live event
    expect(getAllByText('Eagles').length).toBeGreaterThan(0);
    expect(getAllByText('Cowboys').length).toBeGreaterThan(0);
  });

  it('switches to Upcoming tab', () => {
    const { getByTestId, getAllByText } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-upcoming'));
    // Arsenal vs Chelsea is upcoming
    expect(getAllByText('Arsenal').length).toBeGreaterThan(0);
  });

  it('switches to Completed tab', () => {
    const { getByTestId, getAllByText } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-completed'));
    // Rangers vs Devils is completed
    expect(getAllByText('Rangers').length).toBeGreaterThan(0);
    expect(getAllByText('Devils').length).toBeGreaterThan(0);
  });

  it('shows scores for live events', () => {
    const { getAllByText } = render(<SportsPage />);
    // Eagles 24 - Cowboys 17
    expect(getAllByText('24').length).toBeGreaterThan(0);
    expect(getAllByText('17').length).toBeGreaterThan(0);
  });

  it('shows scores for completed events', () => {
    const { getByTestId, getAllByText } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-completed'));
    // Rangers 4 - Devils 2
    expect(getAllByText('4').length).toBeGreaterThan(0);
    expect(getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows LIVE indicator for active events', () => {
    const { getAllByText } = render(<SportsPage />);
    const liveIndicators = getAllByText('LIVE');
    expect(liveIndicators.length).toBeGreaterThan(0);
  });

  it('shows Final indicator for completed events', () => {
    const { getByTestId, getAllByText } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-completed'));
    expect(getAllByText('Final').length).toBeGreaterThan(0);
  });

  it('shows league badges', () => {
    const { getAllByText } = render(<SportsPage />);
    expect(getAllByText('NFL').length).toBeGreaterThan(0);
    expect(getAllByText('NBA').length).toBeGreaterThan(0);
  });

  it('shows record toggle on upcoming events', () => {
    const { getByTestId } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-upcoming'));
    const recordToggle = getByTestId('record-toggle-sev-3');
    expect(recordToggle).toBeDefined();
    expect(recordToggle.textContent).toContain('Record');
  });

  it('toggles record state on click', () => {
    const { getByTestId } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-upcoming'));

    const recordToggle = getByTestId('record-toggle-sev-3');
    expect(recordToggle.textContent).toContain('Record');

    fireEvent.click(recordToggle);
    expect(recordToggle.textContent).toContain('Recording');

    fireEvent.click(recordToggle);
    expect(recordToggle.textContent).toContain('Record');
  });

  it('renders event cards', () => {
    const { getByTestId } = render(<SportsPage />);
    expect(getByTestId('events-grid')).toBeDefined();
    expect(getByTestId('event-card-sev-1')).toBeDefined();
  });

  it('shows tab counts', () => {
    const { getByTestId } = render(<SportsPage />);
    const liveTab = getByTestId('tab-live');
    expect(liveTab.textContent).toContain('2');

    const upcomingTab = getByTestId('tab-upcoming');
    expect(upcomingTab.textContent).toContain('2');

    const completedTab = getByTestId('tab-completed');
    expect(completedTab.textContent).toContain('2');
  });

  it('shows auto-record indicator for favorite team upcoming events', () => {
    const { getByTestId } = render(<SportsPage />);
    fireEvent.click(getByTestId('tab-upcoming'));

    // Yankees (favorite) vs Red Sox is upcoming
    const autoRecord = getByTestId('auto-record-sev-4');
    expect(autoRecord.textContent).toContain('Auto');
  });
});
