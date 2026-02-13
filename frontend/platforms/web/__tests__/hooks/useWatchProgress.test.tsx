import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchProgress } from '@/hooks/useWatchProgress';

describe('useWatchProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(localStorage.getItem).mockClear();
    vi.mocked(localStorage.setItem).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with zero progress', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    expect(result.current.position).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.percentage).toBe(0);
    expect(result.current.isLoaded).toBe(true);
  });

  it('loads saved progress from localStorage on mount', () => {
    const stored = JSON.stringify({
      position: 120,
      duration: 3600,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(localStorage.getItem).mockReturnValueOnce(stored);

    const { result } = renderHook(() => useWatchProgress('media-1'));

    expect(localStorage.getItem).toHaveBeenCalledWith('ntv_progress_media-1');
    expect(result.current.position).toBe(120);
    expect(result.current.duration).toBe(3600);
    expect(result.current.isLoaded).toBe(true);
  });

  it('updatePosition saves position and duration to state', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(60, 3600);
    });

    expect(result.current.position).toBe(60);
    expect(result.current.duration).toBe(3600);
  });

  it('calculates percentage correctly', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(900, 3600);
    });

    expect(result.current.percentage).toBe(25);
  });

  it('clamps percentage between 0 and 100', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    // Position exceeds duration
    act(() => {
      result.current.updatePosition(4000, 3600);
    });

    expect(result.current.percentage).toBe(100);
  });

  it('returns percentage 0 when duration is 0', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(50, 0);
    });

    expect(result.current.percentage).toBe(0);
  });

  it('markAsWatched sets position to duration', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(100, 3600);
    });

    act(() => {
      result.current.markAsWatched();
    });

    expect(result.current.position).toBe(3600);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_progress_media-1',
      expect.stringContaining('"position":3600'),
    );
  });

  it('markAsUnwatched resets position to 0', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(1800, 3600);
    });

    act(() => {
      result.current.markAsUnwatched();
    });

    expect(result.current.position).toBe(0);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_progress_media-1',
      expect.stringContaining('"position":0'),
    );
  });

  it('auto-saves to localStorage on interval', () => {
    const { result } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(500, 3600);
    });

    // Clear any prior setItem calls from markAsWatched etc.
    vi.mocked(localStorage.setItem).mockClear();

    // Advance by 15 seconds (SAVE_INTERVAL_MS)
    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_progress_media-1',
      expect.stringContaining('"position":500'),
    );
  });

  it('saves to localStorage on unmount', () => {
    const { result, unmount } = renderHook(() => useWatchProgress('media-1'));

    act(() => {
      result.current.updatePosition(250, 3600);
    });

    vi.mocked(localStorage.setItem).mockClear();

    unmount();

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ntv_progress_media-1',
      expect.stringContaining('"position":250'),
    );
  });

  it('handles missing localStorage data gracefully', () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce(null);

    const { result } = renderHook(() => useWatchProgress('media-1'));

    expect(result.current.position).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.isLoaded).toBe(true);
  });

  it('handles corrupted localStorage data gracefully', () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce('not-json');

    const { result } = renderHook(() => useWatchProgress('media-1'));

    expect(result.current.position).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.isLoaded).toBe(true);
  });

  it('resets state when mediaId changes', () => {
    const stored = JSON.stringify({
      position: 120,
      duration: 3600,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(localStorage.getItem).mockReturnValueOnce(stored);

    const { result, rerender } = renderHook(
      ({ id }) => useWatchProgress(id),
      { initialProps: { id: 'media-1' } },
    );

    expect(result.current.position).toBe(120);

    // Change mediaId, no stored data for the new one
    vi.mocked(localStorage.getItem).mockReturnValueOnce(null);

    rerender({ id: 'media-2' });

    expect(result.current.position).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('clears interval on unmount to prevent memory leaks', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useWatchProgress('media-1'));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
