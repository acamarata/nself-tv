import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FleetPage from '@/app/(app)/admin/fleet/page';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'admin@nself.org' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('FleetPage', () => {
  it('renders the Fleet Management heading', () => {
    const { getByText } = render(<FleetPage />);
    expect(getByText('Fleet Management')).toBeDefined();
  });

  it('displays status count cards', () => {
    const { getByTestId } = render(<FleetPage />);
    expect(getByTestId('count-online').textContent).toBe('1');
    expect(getByTestId('count-degraded').textContent).toBe('1');
    expect(getByTestId('count-offline').textContent).toBe('1');
  });

  it('renders all device rows', () => {
    const { getByTestId } = render(<FleetPage />);
    expect(getByTestId('device-row-dev-1')).toBeDefined();
    expect(getByTestId('device-row-dev-2')).toBeDefined();
    expect(getByTestId('device-row-dev-3')).toBeDefined();
  });

  it('displays device names', () => {
    const { getByText } = render(<FleetPage />);
    expect(getByText('Living Room HDHomeRun')).toBeDefined();
    expect(getByText('Bedroom Antenna')).toBeDefined();
    expect(getByText('Garage Custom Tuner')).toBeDefined();
  });

  it('displays device IP addresses', () => {
    const { getByText } = render(<FleetPage />);
    expect(getByText('192.168.1.100')).toBeDefined();
    expect(getByText('192.168.1.101')).toBeDefined();
  });

  it('displays tuner counts', () => {
    const { getByText } = render(<FleetPage />);
    expect(getByText('2/4')).toBeDefined();
    expect(getByText('1/2')).toBeDefined();
    expect(getByText('0/1')).toBeDefined();
  });

  it('shows detail panel when a device row is clicked', () => {
    const { getByTestId, queryByTestId } = render(<FleetPage />);

    // No detail panel initially
    expect(queryByTestId('device-detail')).toBeNull();

    // Click on first device
    fireEvent.click(getByTestId('device-row-dev-1'));

    // Detail panel should appear
    expect(getByTestId('device-detail')).toBeDefined();
  });

  it('shows device details in the detail panel', () => {
    const { getByTestId, getByText } = render(<FleetPage />);

    fireEvent.click(getByTestId('device-row-dev-1'));

    const detail = getByTestId('device-detail');
    expect(detail.textContent).toContain('Living Room HDHomeRun');
    expect(detail.textContent).toContain('192.168.1.100');
    expect(detail.textContent).toContain('20260101');
    expect(detail.textContent).toContain('92%');
  });

  it('shows signal chart placeholder in detail panel', () => {
    const { getByTestId } = render(<FleetPage />);

    fireEvent.click(getByTestId('device-row-dev-1'));

    expect(getByTestId('signal-chart-placeholder')).toBeDefined();
  });

  it('shows action buttons in detail panel', () => {
    const { getByTestId, getByText } = render(<FleetPage />);

    fireEvent.click(getByTestId('device-row-dev-1'));

    expect(getByText('Scan Channels')).toBeDefined();
    expect(getByText('Restart Device')).toBeDefined();
    expect(getByText('Update Firmware')).toBeDefined();
  });

  it('highlights selected device row', () => {
    const { getByTestId } = render(<FleetPage />);

    fireEvent.click(getByTestId('device-row-dev-1'));

    const row = getByTestId('device-row-dev-1');
    expect(row.className).toContain('bg-primary/5');
  });

  it('shows Online status text', () => {
    const { getAllByText } = render(<FleetPage />);
    expect(getAllByText('Online').length).toBeGreaterThan(0);
  });

  it('shows Degraded status text', () => {
    const { getAllByText } = render(<FleetPage />);
    expect(getAllByText('Degraded').length).toBeGreaterThan(0);
  });

  it('shows Offline status text', () => {
    const { getAllByText } = render(<FleetPage />);
    expect(getAllByText('Offline').length).toBeGreaterThan(0);
  });
});
