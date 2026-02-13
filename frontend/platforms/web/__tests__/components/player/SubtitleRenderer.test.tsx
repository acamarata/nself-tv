import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SubtitleRenderer } from '@/components/player/SubtitleRenderer';
import type { SubtitleTrack } from '@/hooks/useSubtitles';

function makeTracks(): SubtitleTrack[] {
  return [
    { id: 'en', language: 'en', label: 'English', url: '/subs/en.vtt', isCC: false },
    { id: 'es', language: 'es', label: 'Spanish', url: '/subs/es.vtt', isCC: false },
    { id: 'en-cc', language: 'en', label: 'English (CC)', url: '/subs/en-cc.vtt', isCC: true },
  ];
}

describe('SubtitleRenderer', () => {
  it('returns null when tracks array is empty', () => {
    const { container } = render(
      <SubtitleRenderer tracks={[]} activeTrackId={null} onSelect={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the subtitles toggle button', () => {
    const tracks = makeTracks();
    const { getByLabelText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    expect(getByLabelText('Subtitles')).toBeDefined();
  });

  it('opens the dropdown when toggle button is clicked', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    expect(getByText('Off')).toBeDefined();
    expect(getByText('English')).toBeDefined();
    expect(getByText('Spanish')).toBeDefined();
  });

  it('shows the "Off" option in the dropdown', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    expect(getByText('Off')).toBeDefined();
  });

  it('highlights the "Off" option when activeTrackId is null', () => {
    const tracks = makeTracks();
    const { getByLabelText, getAllByRole } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    const options = getAllByRole('option');
    // First option is "Off"
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('highlights the active track', () => {
    const tracks = makeTracks();
    const { getByLabelText, getAllByRole } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId="es" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    const options = getAllByRole('option');
    // Off=0, English=1, Spanish=2, English (CC)=3
    expect(options[0].getAttribute('aria-selected')).toBe('false'); // Off
    expect(options[2].getAttribute('aria-selected')).toBe('true');  // Spanish
  });

  it('calls onSelect with null when "Off" is clicked', () => {
    const onSelect = vi.fn();
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId="en" onSelect={onSelect} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    fireEvent.click(getByText('Off'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect with track id when a track is clicked', () => {
    const onSelect = vi.fn();
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={onSelect} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    fireEvent.click(getByText('Spanish'));
    expect(onSelect).toHaveBeenCalledWith('es');
  });

  it('shows CC badge for closed caption tracks', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    expect(getByText('cc')).toBeDefined();
  });

  it('closes the dropdown after selecting a track', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText, queryByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Subtitles'));
    expect(getByText('English')).toBeDefined();
    fireEvent.click(getByText('English'));
    // Menu should close after selection
    expect(queryByText('Off')).toBeNull();
  });

  it('toggles dropdown open and closed on repeated clicks', () => {
    const tracks = makeTracks();
    const { getByLabelText, queryByText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    const button = getByLabelText('Subtitles');
    // Open
    fireEvent.click(button);
    expect(queryByText('Off')).not.toBeNull();
    // Close
    fireEvent.click(button);
    expect(queryByText('Off')).toBeNull();
  });

  it('has aria-expanded attribute on toggle button', () => {
    const tracks = makeTracks();
    const { getByLabelText } = render(
      <SubtitleRenderer tracks={tracks} activeTrackId={null} onSelect={vi.fn()} />,
    );
    const button = getByLabelText('Subtitles');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});
