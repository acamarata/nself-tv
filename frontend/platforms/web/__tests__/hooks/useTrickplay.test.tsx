import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrickplay } from '@/hooks/useTrickplay';
import type { TrickplayConfig, TrickplayCue } from '@/lib/trickplay/loader';
import { TrickplayLoader } from '@/lib/trickplay/loader';

// Mock the TrickplayLoader class
vi.mock('@/lib/trickplay/loader', () => {
  const MockTrickplayLoader = vi.fn();
  return {
    TrickplayLoader: MockTrickplayLoader,
  };
});

const sampleConfig: TrickplayConfig = {
  vttUrl: '/trickplay/manifest.vtt',
  spriteBaseUrl: '/trickplay/sprites',
  tileWidth: 320,
  tileHeight: 180,
  gridColumns: 5,
  gridRows: 5,
};

const sampleCue: TrickplayCue = {
  startTime: 10,
  endTime: 15,
  spriteUrl: '/trickplay/sprites/sprite_0.jpg',
  x: 320,
  y: 0,
};

describe('useTrickplay', () => {
  let mockLoad: ReturnType<typeof vi.fn>;
  let mockIsLoaded: ReturnType<typeof vi.fn>;
  let mockGetCueAtTime: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoad = vi.fn().mockResolvedValue(undefined);
    mockIsLoaded = vi.fn().mockReturnValue(false);
    mockGetCueAtTime = vi.fn().mockReturnValue(null);

    vi.mocked(TrickplayLoader).mockImplementation(() => ({
      load: mockLoad,
      isLoaded: mockIsLoaded,
      getCueAtTime: mockGetCueAtTime,
      getCues: vi.fn().mockReturnValue([]),
    }) as unknown as TrickplayLoader);
  });

  it('returns initial state with no cue and not loaded', () => {
    const { result } = renderHook(() => useTrickplay(sampleConfig));

    expect(result.current.currentCue).toBeNull();
    expect(result.current.isLoaded).toBe(false);
  });

  it('returns null cue when no trickplay config', () => {
    const { result } = renderHook(() => useTrickplay(null));

    expect(result.current.currentCue).toBeNull();
    expect(result.current.isLoaded).toBe(false);
  });

  it('onSeekStart loads VTT data', async () => {
    const { result } = renderHook(() => useTrickplay(sampleConfig));

    await act(async () => {
      await result.current.onSeekStart();
    });

    expect(mockLoad).toHaveBeenCalledOnce();
    expect(result.current.isLoaded).toBe(true);
  });

  it('onSeekStart does not reload if already loaded', async () => {
    mockIsLoaded.mockReturnValue(true);

    const { result } = renderHook(() => useTrickplay(sampleConfig));

    await act(async () => {
      await result.current.onSeekStart();
    });

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('onSeekStart handles load failure gracefully', async () => {
    mockLoad.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTrickplay(sampleConfig));

    // Should not throw
    await act(async () => {
      await result.current.onSeekStart();
    });

    expect(result.current.isLoaded).toBe(false);
  });

  it('onSeekMove updates current cue when loaded', () => {
    mockIsLoaded.mockReturnValue(true);
    mockGetCueAtTime.mockReturnValue(sampleCue);

    const { result } = renderHook(() => useTrickplay(sampleConfig));

    act(() => {
      result.current.onSeekMove(12);
    });

    expect(mockGetCueAtTime).toHaveBeenCalledWith(12);
    expect(result.current.currentCue).toEqual(sampleCue);
  });

  it('onSeekMove returns null cue when not loaded', () => {
    mockIsLoaded.mockReturnValue(false);

    const { result } = renderHook(() => useTrickplay(sampleConfig));

    act(() => {
      result.current.onSeekMove(12);
    });

    expect(result.current.currentCue).toBeNull();
    expect(mockGetCueAtTime).not.toHaveBeenCalled();
  });

  it('onSeekEnd hides the preview by clearing current cue', () => {
    mockIsLoaded.mockReturnValue(true);
    mockGetCueAtTime.mockReturnValue(sampleCue);

    const { result } = renderHook(() => useTrickplay(sampleConfig));

    // Show a cue first
    act(() => {
      result.current.onSeekMove(12);
    });

    expect(result.current.currentCue).toEqual(sampleCue);

    // End seek
    act(() => {
      result.current.onSeekEnd();
    });

    expect(result.current.currentCue).toBeNull();
  });

  it('resets state when config changes to null', () => {
    const { result, rerender } = renderHook(
      ({ config }) => useTrickplay(config),
      { initialProps: { config: sampleConfig as TrickplayConfig | null } },
    );

    // Change config to null
    rerender({ config: null });

    expect(result.current.currentCue).toBeNull();
    expect(result.current.isLoaded).toBe(false);
  });

  it('creates new loader when config changes', () => {
    const { rerender } = renderHook(
      ({ config }) => useTrickplay(config),
      { initialProps: { config: sampleConfig as TrickplayConfig | null } },
    );

    // Constructor was called once for initial render
    expect(TrickplayLoader).toHaveBeenCalledTimes(1);
    expect(TrickplayLoader).toHaveBeenCalledWith(sampleConfig);

    const newConfig: TrickplayConfig = {
      ...sampleConfig,
      vttUrl: '/trickplay/new-manifest.vtt',
    };

    vi.mocked(TrickplayLoader).mockClear();

    rerender({ config: newConfig });

    expect(TrickplayLoader).toHaveBeenCalledWith(newConfig);
  });

  it('onSeekStart does nothing when config is null', async () => {
    const { result } = renderHook(() => useTrickplay(null));

    await act(async () => {
      await result.current.onSeekStart();
    });

    expect(mockLoad).not.toHaveBeenCalled();
    expect(result.current.isLoaded).toBe(false);
  });

  it('onSeekMove returns null when config is null', () => {
    const { result } = renderHook(() => useTrickplay(null));

    act(() => {
      result.current.onSeekMove(10);
    });

    expect(result.current.currentCue).toBeNull();
  });

  it('exposes onSeekStart, onSeekMove, and onSeekEnd functions', () => {
    const { result } = renderHook(() => useTrickplay(sampleConfig));

    expect(typeof result.current.onSeekStart).toBe('function');
    expect(typeof result.current.onSeekMove).toBe('function');
    expect(typeof result.current.onSeekEnd).toBe('function');
  });
});
