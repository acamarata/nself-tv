import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaybackSession } from '@/hooks/usePlaybackSession';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    tokens: { accessToken: 'test-token' },
    isAuthenticated: true,
  }),
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234-5678-9012';
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
});

describe('usePlaybackSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with no session', () => {
    const { result } = renderHook(() => usePlaybackSession('media-1'));

    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('startSession creates a session after delay', async () => {
    const { result } = renderHook(() => usePlaybackSession('media-1'));

    await act(async () => {
      const promise = result.current.startSession();
      // Advance past the 500ms mock delay
      vi.advanceTimersByTime(500);
      await promise;
    });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.mediaId).toBe('media-1');
    expect(result.current.session?.sessionId).toBe(mockUUID);
    expect(result.current.session?.signedUrl).toContain('media-1');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('isLoading is false after startSession completes', async () => {
    const { result } = renderHook(() => usePlaybackSession('media-1'));

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    // After startSession resolves, isLoading should be false and session should exist
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).not.toBeNull();
  });

  it('endSession clears the session', async () => {
    const { result } = renderHook(() => usePlaybackSession('media-1'));

    // Start a session first
    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    expect(result.current.session).not.toBeNull();

    // End the session
    await act(async () => {
      await result.current.endSession();
    });

    expect(result.current.session).toBeNull();
  });

  it('endSession does nothing when no session exists', async () => {
    const { result } = renderHook(() => usePlaybackSession('media-1'));

    // Should not throw
    await act(async () => {
      await result.current.endSession();
    });

    expect(result.current.session).toBeNull();
  });

  it('starts heartbeat interval when session is active', async () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    const { result } = renderHook(() => usePlaybackSession('media-1'));

    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    // setInterval should have been called for heartbeat (60s interval)
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    setIntervalSpy.mockRestore();
  });

  it('clears heartbeat interval on endSession', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { result } = renderHook(() => usePlaybackSession('media-1'));

    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    clearIntervalSpy.mockClear();

    await act(async () => {
      await result.current.endSession();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('clears heartbeat interval on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { result, unmount } = renderHook(() => usePlaybackSession('media-1'));

    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    clearIntervalSpy.mockClear();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('session contains valid expiry and start timestamps', async () => {
    const now = Date.now();

    const { result } = renderHook(() => usePlaybackSession('media-1'));

    await act(async () => {
      const promise = result.current.startSession();
      vi.advanceTimersByTime(500);
      await promise;
    });

    const session = result.current.session;
    expect(session).not.toBeNull();
    // startedAt should be approximately now
    expect(session!.startedAt).toBeGreaterThanOrEqual(now);
    // expiresAt should be 8 hours from startedAt
    expect(session!.expiresAt).toBe(session!.startedAt + 8 * 60 * 60 * 1000);
  });
});
