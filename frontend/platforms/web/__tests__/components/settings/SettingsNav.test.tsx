import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsNav } from '@/components/settings/SettingsNav';

describe('SettingsNav', () => {
  it('renders Settings heading', () => {
    const { getByText } = render(<SettingsNav />);
    expect(getByText('Settings')).toBeDefined();
  });

  it('renders all nav items', () => {
    const { getByText } = render(<SettingsNav />);
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Playback')).toBeDefined();
    expect(getByText('Parental Controls')).toBeDefined();
    expect(getByText('Devices')).toBeDefined();
    expect(getByText('About')).toBeDefined();
  });

  it('renders links with correct hrefs', () => {
    const { container } = render(<SettingsNav />);
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/settings/account');
    expect(hrefs).toContain('/settings/playback');
    expect(hrefs).toContain('/settings/devices');
    expect(hrefs).toContain('/settings/about');
  });
});
