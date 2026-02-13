import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useManualQuality } from '@/hooks/useManualQuality';

function createMockHls() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    currentLevel: -1,
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

describe('useManualQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auto mode by default', () => {
    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: null }),
    );

    expect(result.current.isAutoMode).toBe(true);
    expect(result.current.manualLevel).toBeNull();
    expect(result.current.bufferingCount).toBe(0);
  });

  it('selectQuality switches to manual mode', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    act(() => {
      result.current.selectQuality(2);
    });

    expect(result.current.isAutoMode).toBe(false);
    expect(result.current.manualLevel).toBe(2);
    expect(mockHls.currentLevel).toBe(2);
  });

  it('selectQuality with auto resets to auto mode', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    // First set manual
    act(() => {
      result.current.selectQuality(2);
    });

    expect(result.current.isAutoMode).toBe(false);

    // Then reset to auto
    act(() => {
      result.current.selectQuality('auto');
    });

    expect(result.current.isAutoMode).toBe(true);
    expect(result.current.manualLevel).toBeNull();
    expect(mockHls.currentLevel).toBe(-1);
    expect(result.current.bufferingCount).toBe(0);
  });

  it('does nothing when hlsInstance is null', () => {
    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: null }),
    );

    act(() => {
      result.current.selectQuality(2);
    });

    // Should stay in auto mode since hls is null
    expect(result.current.isAutoMode).toBe(true);
    expect(result.current.manualLevel).toBeNull();
  });

  it('tracks buffering stall count in manual mode', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    // Switch to manual mode
    act(() => {
      result.current.selectQuality(2);
    });

    // Simulate buffer stall error
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });

    expect(result.current.bufferingCount).toBe(1);
  });

  it('auto-reverts to auto mode after 3 buffering stalls', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    // Switch to manual mode
    act(() => {
      result.current.selectQuality(2);
    });

    // Simulate 3 buffer stalls
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });

    expect(result.current.isAutoMode).toBe(true);
    expect(result.current.manualLevel).toBeNull();
    expect(result.current.bufferingCount).toBe(0);
    expect(mockHls.currentLevel).toBe(-1);
  });

  it('ignores non-bufferStalledError errors', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    act(() => {
      result.current.selectQuality(2);
    });

    // Simulate a different error type
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'fragLoadError' });
    });

    expect(result.current.bufferingCount).toBe(0);
  });

  it('ignores buffer stalls in auto mode', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    // Stay in auto mode, simulate stall
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });

    expect(result.current.bufferingCount).toBe(0);
  });

  it('resets buffering count when switching quality', () => {
    const mockHls = createMockHls();

    const { result } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    act(() => {
      result.current.selectQuality(2);
    });

    // Simulate one stall
    act(() => {
      mockHls.emit('hlsError', 'hlsError', { details: 'bufferStalledError' });
    });

    expect(result.current.bufferingCount).toBe(1);

    // Switch to a different quality level
    act(() => {
      result.current.selectQuality(1);
    });

    expect(result.current.bufferingCount).toBe(0);
  });

  it('removes event listener on unmount', () => {
    const mockHls = createMockHls();

    const { unmount } = renderHook(() =>
      useManualQuality({ hlsInstance: mockHls as never }),
    );

    unmount();

    expect(mockHls.off).toHaveBeenCalledWith('hlsError', expect.any(Function));
  });
});
