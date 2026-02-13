import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubtitles } from '@/hooks/useSubtitles';
import type { SubtitleTrack } from '@/hooks/useSubtitles';

function createMockVideoElement(): HTMLVideoElement {
  const tracks: Array<{ mode: string; label: string; language: string }> = [];
  const trackElements: Element[] = [];

  const textTracksList = {
    get length() {
      return tracks.length;
    },
    [Symbol.iterator]: function* () {
      for (const track of tracks) {
        yield track;
      }
    },
  } as unknown as TextTrackList;

  // Allow index access
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(textTracksList, i, {
      get: () => tracks[i],
      configurable: true,
    });
  }

  const videoEl = {
    textTracks: textTracksList,
    querySelectorAll: vi.fn(() => trackElements),
    appendChild: vi.fn((child: Element) => {
      trackElements.push(child);
      tracks.push({
        mode: 'disabled',
        label: child.getAttribute('label') || '',
        language: child.getAttribute('srclang') || '',
      });
      // Update textTracksList length
      for (let i = 0; i < tracks.length; i++) {
        Object.defineProperty(textTracksList, i, {
          get: () => tracks[i],
          configurable: true,
        });
      }
      return child;
    }),
    _tracks: tracks,
    _trackElements: trackElements,
  } as unknown as HTMLVideoElement;

  return videoEl;
}

const sampleTracks: SubtitleTrack[] = [
  { id: 'sub-en', language: 'en', label: 'English', url: '/subs/en.vtt' },
  { id: 'sub-es', language: 'es', label: 'Spanish', url: '/subs/es.vtt' },
  { id: 'sub-ar', language: 'ar', label: 'Arabic', url: '/subs/ar.vtt' },
];

describe('useSubtitles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default navigator language to en
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
  });

  it('returns initial state with empty tracks and no active track', () => {
    const { result } = renderHook(() => useSubtitles(null));

    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrackId).toBeNull();
  });

  it('loadTracks stores tracks even without video element', () => {
    const { result } = renderHook(() => useSubtitles(null));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(result.current.tracks).toEqual(sampleTracks);
  });

  it('loadTracks creates track elements on video element', () => {
    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(result.current.tracks).toEqual(sampleTracks);
    expect(videoEl.appendChild).toHaveBeenCalledTimes(3);
  });

  it('auto-selects track based on navigator language', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'es-MX',
      configurable: true,
    });

    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(result.current.activeTrackId).toBe('sub-es');
  });

  it('auto-selects English track for en navigator language', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(result.current.activeTrackId).toBe('sub-en');
  });

  it('sets activeTrackId to null when no matching language', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'fr-FR',
      configurable: true,
    });

    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(result.current.activeTrackId).toBeNull();
  });

  it('switchTrack sets active track ID', () => {
    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    act(() => {
      result.current.switchTrack('sub-ar');
    });

    expect(result.current.activeTrackId).toBe('sub-ar');
  });

  it('switchTrack with null disables subtitles', () => {
    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    act(() => {
      result.current.switchTrack(null);
    });

    expect(result.current.activeTrackId).toBeNull();
  });

  it('handles empty tracks list gracefully', () => {
    const videoEl = createMockVideoElement();

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks([]);
    });

    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrackId).toBeNull();
  });

  it('removes existing ntv subtitle tracks before adding new ones', () => {
    const mockRemove = vi.fn();
    const existingTrackEl = { remove: mockRemove };

    const videoEl = createMockVideoElement();
    vi.mocked(videoEl.querySelectorAll).mockReturnValueOnce(
      [existingTrackEl] as unknown as NodeListOf<Element>,
    );

    const { result } = renderHook(() => useSubtitles(videoEl));

    act(() => {
      result.current.loadTracks(sampleTracks);
    });

    expect(videoEl.querySelectorAll).toHaveBeenCalledWith('track[data-ntv-subtitle]');
    expect(mockRemove).toHaveBeenCalledOnce();
  });

  it('exposes loadTracks and switchTrack functions', () => {
    const { result } = renderHook(() => useSubtitles(null));

    expect(typeof result.current.loadTracks).toBe('function');
    expect(typeof result.current.switchTrack).toBe('function');
  });
});
