import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AudioTrackSelector } from '@/components/player/AudioTrackSelector';
import type { AudioTrack } from '@/hooks/useAudioTracks';

function makeTracks(): AudioTrack[] {
  return [
    { id: 'en', language: 'en', label: 'English', codec: 'mp4a.40.2' },
    { id: 'es', language: 'es', label: 'Spanish', codec: 'ac-3' },
    { id: 'fr', language: 'fr', label: 'French', codec: 'unknown' },
  ];
}

describe('AudioTrackSelector', () => {
  it('returns null when tracks array is empty', () => {
    const { container } = render(
      <AudioTrackSelector tracks={[]} activeTrackId={null} onSelect={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when only one track is available', () => {
    const singleTrack: AudioTrack[] = [
      { id: 'en', language: 'en', label: 'English', codec: 'mp4a.40.2' },
    ];
    const { container } = render(
      <AudioTrackSelector tracks={singleTrack} activeTrackId="en" onSelect={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the audio tracks toggle button', () => {
    const tracks = makeTracks();
    const { getByLabelText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    expect(getByLabelText('Audio tracks')).toBeDefined();
  });

  it('opens the dropdown when toggle button is clicked', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    expect(getByText('English')).toBeDefined();
    expect(getByText('Spanish')).toBeDefined();
    expect(getByText('French')).toBeDefined();
  });

  it('renders the audio track list with all tracks', () => {
    const tracks = makeTracks();
    const { getByLabelText, getAllByRole } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    const options = getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('highlights the active track', () => {
    const tracks = makeTracks();
    const { getByLabelText, getAllByRole } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="es" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    const options = getAllByRole('option');
    expect(options[0].getAttribute('aria-selected')).toBe('false'); // English
    expect(options[1].getAttribute('aria-selected')).toBe('true');  // Spanish
    expect(options[2].getAttribute('aria-selected')).toBe('false'); // French
  });

  it('calls onSelect with track id when a track is clicked', () => {
    const onSelect = vi.fn();
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={onSelect} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    fireEvent.click(getByText('Spanish'));
    expect(onSelect).toHaveBeenCalledWith('es');
  });

  it('shows codec info for tracks with known codecs', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    expect(getByText('mp4a.40.2')).toBeDefined();
    expect(getByText('ac-3')).toBeDefined();
  });

  it('does not show codec info for tracks with "unknown" codec', () => {
    const tracks = makeTracks();
    const { getByLabelText, queryAllByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    // "unknown" should NOT appear as a codec label
    const unknownElements = queryAllByText('unknown');
    expect(unknownElements).toHaveLength(0);
  });

  it('closes the dropdown after selecting a track', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText, queryByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    expect(getByText('Spanish')).toBeDefined();
    fireEvent.click(getByText('Spanish'));
    // Menu should close
    expect(queryByText('Audio')).toBeNull();
  });

  it('has aria-expanded attribute on toggle button', () => {
    const tracks = makeTracks();
    const { getByLabelText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    const button = getByLabelText('Audio tracks');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows "Audio" heading in the dropdown', () => {
    const tracks = makeTracks();
    const { getByLabelText, getByText } = render(
      <AudioTrackSelector tracks={tracks} activeTrackId="en" onSelect={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Audio tracks'));
    expect(getByText('Audio')).toBeDefined();
  });
});
