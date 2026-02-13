import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioTracks } from '@/hooks/useAudioTracks';
import type { AudioTrack } from '@/hooks/useAudioTracks';

// Mock hls.js module
vi.mock('hls.js', () => ({
  default: vi.fn(),
  Events: {
    MANIFEST_PARSED: 'hlsManifestParsed',
    AUDIO_TRACK_SWITCHED: 'hlsAudioTrackSwitched',
  },
}));

function createMockHls() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    audioTrack: 0,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    emit: (event: string, ...args: unknown[]) => {
      (listeners[event] || []).forEach((h) => h(...args));
    },
    _listeners: listeners,
  };
}

const sampleManualTracks: AudioTrack[] = [
  { id: 'audio-0', language: 'en', label: 'English', codec: 'aac' },
  { id: 'audio-1', language: 'es', label: 'Spanish', codec: 'aac' },
];

describe('useAudioTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state with empty tracks and no active track', () => {
    const { result } = renderHook(() => useAudioTracks(null));

    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrackId).toBeNull();
  });

  it('loadTracks manually sets tracks and selects the first', () => {
    const { result } = renderHook(() => useAudioTracks(null));

    act(() => {
      result.current.loadTracks(sampleManualTracks);
    });

    expect(result.current.tracks).toEqual(sampleManualTracks);
    expect(result.current.activeTrackId).toBe('audio-0');
  });

  it('loadTracks with empty array keeps activeTrackId unchanged', () => {
    const { result } = renderHook(() => useAudioTracks(null));

    act(() => {
      result.current.loadTracks([]);
    });

    expect(result.current.tracks).toEqual([]);
    // activeTrackId should remain null since no tracks to select
    expect(result.current.activeTrackId).toBeNull();
  });

  it('switchTrack changes active track on hls instance', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    // Load tracks manually first
    act(() => {
      result.current.loadTracks(sampleManualTracks);
    });

    act(() => {
      result.current.switchTrack('audio-1');
    });

    expect(result.current.activeTrackId).toBe('audio-1');
    expect(mockHls.audioTrack).toBe(1);
  });

  it('switchTrack does nothing when hls instance is null', () => {
    const { result } = renderHook(() => useAudioTracks(null));

    act(() => {
      result.current.loadTracks(sampleManualTracks);
    });

    act(() => {
      result.current.switchTrack('audio-1');
    });

    // activeTrackId stays at the first selected track
    expect(result.current.activeTrackId).toBe('audio-0');
  });

  it('switchTrack ignores invalid track IDs', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      result.current.loadTracks(sampleManualTracks);
    });

    act(() => {
      result.current.switchTrack('nonexistent');
    });

    // Should not change
    expect(result.current.activeTrackId).toBe('audio-0');
  });

  it('discovers audio tracks from MANIFEST_PARSED event', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {
        audioTracks: [
          { lang: 'en', name: 'English', audioCodec: 'mp4a.40.2' },
          { lang: 'fr', name: 'French', audioCodec: 'ac-3' },
        ],
      });
    });

    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks[0].language).toBe('en');
    expect(result.current.tracks[0].label).toBe('English');
    expect(result.current.tracks[0].codec).toBe('mp4a.40.2');
    expect(result.current.tracks[1].language).toBe('fr');
    expect(result.current.tracks[1].label).toBe('French');
    expect(result.current.activeTrackId).toBe('audio-0');
  });

  it('handles MANIFEST_PARSED with no audio tracks', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {
        audioTracks: [],
      });
    });

    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrackId).toBeNull();
  });

  it('handles MANIFEST_PARSED with undefined audioTracks', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {});
    });

    expect(result.current.tracks).toEqual([]);
    expect(result.current.activeTrackId).toBeNull();
  });

  it('handles AUDIO_TRACK_SWITCHED event', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    // First load tracks via MANIFEST_PARSED
    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {
        audioTracks: [
          { lang: 'en', name: 'English', audioCodec: 'aac' },
          { lang: 'es', name: 'Spanish', audioCodec: 'aac' },
        ],
      });
    });

    expect(result.current.activeTrackId).toBe('audio-0');

    // Simulate audio track switch
    act(() => {
      mockHls.emit('hlsAudioTrackSwitched', 'hlsAudioTrackSwitched', { id: 1 });
    });

    expect(result.current.activeTrackId).toBe('audio-1');
  });

  it('handles single audio track (no switching needed)', () => {
    const { result } = renderHook(() => useAudioTracks(null));

    act(() => {
      result.current.loadTracks([sampleManualTracks[0]]);
    });

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.activeTrackId).toBe('audio-0');
  });

  it('provides fallback values for missing audio track properties', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {
        audioTracks: [
          { lang: undefined, name: undefined, audioCodec: undefined },
        ],
      });
    });

    expect(result.current.tracks[0].language).toBe('und');
    expect(result.current.tracks[0].label).toBe('Track 1');
    expect(result.current.tracks[0].codec).toBe('unknown');
  });

  it('removes event listeners on unmount', () => {
    const mockHls = createMockHls();

    const { unmount } = renderHook(() => useAudioTracks(mockHls as never));

    unmount();

    expect(mockHls.off).toHaveBeenCalledWith('hlsManifestParsed', expect.any(Function));
    expect(mockHls.off).toHaveBeenCalledWith('hlsAudioTrackSwitched', expect.any(Function));
  });

  it('uses current hlsInstance.audioTrack for initial active track', () => {
    const mockHls = createMockHls();
    mockHls.audioTrack = 1;

    const { result } = renderHook(() => useAudioTracks(mockHls as never));

    act(() => {
      mockHls.emit('hlsManifestParsed', 'hlsManifestParsed', {
        audioTracks: [
          { lang: 'en', name: 'English', audioCodec: 'aac' },
          { lang: 'es', name: 'Spanish', audioCodec: 'aac' },
        ],
      });
    });

    expect(result.current.activeTrackId).toBe('audio-1');
  });
});
