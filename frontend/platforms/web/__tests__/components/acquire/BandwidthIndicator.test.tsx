import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BandwidthIndicator } from '@/components/acquire/BandwidthIndicator';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

describe('BandwidthIndicator', () => {
  const defaultProps = {
    downloadSpeed: 5120,   // 5 MB/s
    uploadSpeed: 1024,     // 1 MB/s
    downloadLimit: 10240,  // 10 MB/s
    uploadLimit: 2048,     // 2 MB/s
  };

  it('renders with data-testid', () => {
    const { getByTestId } = render(<BandwidthIndicator {...defaultProps} />);
    expect(getByTestId('bandwidth-indicator')).toBeDefined();
  });

  it('renders download speed formatted as MB/s', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    expect(container.textContent).toContain('5.0 MB/s');
  });

  it('renders upload speed formatted as MB/s', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    expect(container.textContent).toContain('1.0 MB/s');
  });

  it('renders download limit', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    expect(container.textContent).toContain('10.0 MB/s');
  });

  it('renders upload limit', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    expect(container.textContent).toContain('2.0 MB/s');
  });

  it('formats speeds in KB/s when under 1024', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={512} uploadSpeed={256} downloadLimit={1024} uploadLimit={512} />,
    );
    expect(container.textContent).toContain('512 KB/s');
    expect(container.textContent).toContain('256 KB/s');
  });

  it('renders download progress bar at correct percentage', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    // 5120/10240 = 50%
    const bars = container.querySelectorAll('[style*="width"]');
    const dlBar = bars[0];
    expect(dlBar?.getAttribute('style')).toContain('50%');
  });

  it('renders upload progress bar at correct percentage', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    // 1024/2048 = 50%
    const bars = container.querySelectorAll('[style*="width"]');
    const ulBar = bars[1];
    expect(ulBar?.getAttribute('style')).toContain('50%');
  });

  it('caps progress bar at 100% when speed exceeds limit', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={20000} uploadSpeed={5000} downloadLimit={10000} uploadLimit={2000} />,
    );
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars[0]?.getAttribute('style')).toContain('100%');
    expect(bars[1]?.getAttribute('style')).toContain('100%');
  });

  it('renders 0% progress when limit is 0', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={5000} uploadSpeed={1000} downloadLimit={0} uploadLimit={0} />,
    );
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars[0]?.getAttribute('style')).toContain('0%');
    expect(bars[1]?.getAttribute('style')).toContain('0%');
  });

  it('renders both speed and limit for download', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={2048} uploadSpeed={512} downloadLimit={4096} uploadLimit={1024} />,
    );
    expect(container.textContent).toContain('2.0 MB/s');
    expect(container.textContent).toContain('4.0 MB/s');
  });

  it('renders ArrowDown icon for download', () => {
    const { getByTestId } = render(<BandwidthIndicator {...defaultProps} />);
    expect(getByTestId('icon-ArrowDown')).toBeDefined();
  });

  it('renders ArrowUp icon for upload', () => {
    const { getByTestId } = render(<BandwidthIndicator {...defaultProps} />);
    expect(getByTestId('icon-ArrowUp')).toBeDefined();
  });

  it('renders progress bars with correct background colors', () => {
    const { container } = render(<BandwidthIndicator {...defaultProps} />);
    const greenBar = container.querySelector('.bg-green-500');
    const blueBar = container.querySelector('.bg-blue-500');
    expect(greenBar).not.toBeNull();
    expect(blueBar).not.toBeNull();
  });

  it('handles edge case of zero speeds', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={0} uploadSpeed={0} downloadLimit={10240} uploadLimit={2048} />,
    );
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars[0]?.getAttribute('style')).toContain('0%');
    expect(bars[1]?.getAttribute('style')).toContain('0%');
    expect(container.textContent).toContain('0 KB/s');
  });

  it('calculates correct percentage for partial speed', () => {
    const { container } = render(
      <BandwidthIndicator downloadSpeed={2560} uploadSpeed={512} downloadLimit={10240} uploadLimit={2048} />,
    );
    // 2560/10240 = 25%, 512/2048 = 25%
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars[0]?.getAttribute('style')).toContain('25%');
    expect(bars[1]?.getAttribute('style')).toContain('25%');
  });
});
