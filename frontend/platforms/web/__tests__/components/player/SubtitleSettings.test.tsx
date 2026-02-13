import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SubtitleSettings } from '@/components/player/SubtitleSettings';

describe('SubtitleSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(localStorage.getItem).mockClear();
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('renders the "Subtitle Appearance" heading', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Subtitle Appearance')).toBeDefined();
  });

  it('renders font size options', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Small')).toBeDefined();
    expect(getByText('Medium')).toBeDefined();
    expect(getByText('Large')).toBeDefined();
    expect(getByText('Extra Large')).toBeDefined();
  });

  it('renders the "Font Size" legend', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Font Size')).toBeDefined();
  });

  it('renders font color options', () => {
    const { getByLabelText } = render(<SubtitleSettings />);
    expect(getByLabelText('White')).toBeDefined();
    expect(getByLabelText('Yellow')).toBeDefined();
    expect(getByLabelText('Green')).toBeDefined();
    expect(getByLabelText('Cyan')).toBeDefined();
  });

  it('renders the "Font Color" legend', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Font Color')).toBeDefined();
  });

  it('renders background options', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Transparent')).toBeDefined();
    expect(getByText('Semi-transparent')).toBeDefined();
    expect(getByText('Opaque')).toBeDefined();
  });

  it('renders the "Background" legend', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Background')).toBeDefined();
  });

  it('renders the sample preview text', () => {
    const { getByText } = render(<SubtitleSettings />);
    expect(getByText('Sample Subtitle')).toBeDefined();
  });

  it('persists font size change to localStorage', () => {
    const { getByText } = render(<SubtitleSettings />);
    fireEvent.click(getByText('Large'));
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_subtitle_prefs',
      expect.stringContaining('"fontSize":"large"'),
    );
  });

  it('persists font color change to localStorage', () => {
    const { getByLabelText } = render(<SubtitleSettings />);
    fireEvent.click(getByLabelText('Yellow'));
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_subtitle_prefs',
      expect.stringContaining('"fontColor":"yellow"'),
    );
  });

  it('persists background change to localStorage', () => {
    const { getByText } = render(<SubtitleSettings />);
    fireEvent.click(getByText('Opaque'));
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_subtitle_prefs',
      expect.stringContaining('"background":"opaque"'),
    );
  });

  it('loads saved preferences from localStorage on mount', () => {
    const saved = JSON.stringify({
      fontSize: 'large',
      fontColor: 'yellow',
      background: 'opaque',
    });
    vi.mocked(localStorage.getItem).mockReturnValue(saved);

    const { getByText, getByLabelText } = render(<SubtitleSettings />);

    // The "Large" button should have the active class (bg-primary)
    const largeBtn = getByText('Large');
    expect(largeBtn.className).toContain('bg-primary');

    // The "Yellow" color button should have the active border class
    const yellowBtn = getByLabelText('Yellow');
    expect(yellowBtn.className).toContain('border-primary');

    // The "Opaque" button should have the active class
    const opaqueBtn = getByText('Opaque');
    expect(opaqueBtn.className).toContain('bg-primary');
  });

  it('applies default preferences when localStorage is empty', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { getByText } = render(<SubtitleSettings />);

    // Default is medium, so Medium button should be active
    const mediumBtn = getByText('Medium');
    expect(mediumBtn.className).toContain('bg-primary');
  });

  it('applies CSS custom properties to the wrapper div', () => {
    const { container } = render(<SubtitleSettings />);
    const wrapper = container.firstChild as HTMLElement;
    // Default values
    expect(wrapper.style.getPropertyValue('--ntv-sub-font-size')).toBe('1.125rem');
    expect(wrapper.style.getPropertyValue('--ntv-sub-font-color')).toBe('#ffffff');
    expect(wrapper.style.getPropertyValue('--ntv-sub-bg')).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('updates CSS custom properties when settings change', () => {
    const { container, getByText } = render(<SubtitleSettings />);
    fireEvent.click(getByText('Large'));
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue('--ntv-sub-font-size')).toBe('1.5rem');
  });

  it('renders children within the wrapper', () => {
    const { getByText } = render(
      <SubtitleSettings>
        <div>Child Content</div>
      </SubtitleSettings>,
    );
    expect(getByText('Child Content')).toBeDefined();
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('not valid json');

    // Should not throw, should use defaults
    const { getByText } = render(<SubtitleSettings />);
    const mediumBtn = getByText('Medium');
    expect(mediumBtn.className).toContain('bg-primary');
  });
});
