import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQualityMonitor } from '@/hooks/useQualityMonitor';
import type { QualityLevel } from '@/lib/bba2/algorithm';

const mockLevels: QualityLevel[] = [
  { index: 0, bitrate: 500_000, width: 640, height: 360, name: '360p' },
  { index: 1, bitrate: 1_500_000, width: 1280, height: 720, name: '720p' },
  { index: 2, bitrate: 4_000_000, width: 1920, height: 1080, name: '1080p' },
  { index: 3, bitrate: 8_000_000, width: 3840, height: 2160, name: '4K' },
];

describe('useQualityMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('returns null toast initially when at preferred quality', () => {
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 2, preferredLevel: 2, levels: mockLevels }),
    );
    expect(result.current.toast).toBeNull();
  });

  it('reports downgrade toast after threshold', () => {
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 1, preferredLevel: 2, levels: mockLevels }),
    );
    expect(result.current.toast).toBeNull();
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.toast).not.toBeNull();
    expect(result.current.toast?.type).toBe('downgrade');
    expect(result.current.toast?.message).toContain('720p');
    expect(result.current.toast?.level).toBe('720p');
  });

  it('reports sustained-low toast after 60 seconds', () => {
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 0, preferredLevel: 2, levels: mockLevels }),
    );
    act(() => { vi.advanceTimersByTime(60_001); });
    expect(result.current.toast).not.toBeNull();
    expect(result.current.toast?.type).toBe('sustained-low');
    expect(result.current.toast?.message).toContain('360p');
  });

  it('reports recovery when quality returns to preferred level', () => {
    const { result, rerender } = renderHook(
      ({ currentLevel }) => useQualityMonitor({ currentLevel, preferredLevel: 2, levels: mockLevels }),
      { initialProps: { currentLevel: 1 } },
    );
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.toast?.type).toBe('downgrade');
    rerender({ currentLevel: 2 });
    expect(result.current.toast).not.toBeNull();
    expect(result.current.toast?.type).toBe('recovery');
    expect(result.current.toast?.message).toContain('1080p');
  });

  it('dismissToast clears the active toast', () => {
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 1, preferredLevel: 2, levels: mockLevels }),
    );
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.toast).not.toBeNull();
    act(() => { result.current.dismissToast(); });
    expect(result.current.toast).toBeNull();
  });

  it('no toast when current level equals preferred level', () => {
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 2, preferredLevel: 2, levels: mockLevels }),
    );
    act(() => { vi.advanceTimersByTime(60_001); });
    expect(result.current.toast).toBeNull();
  });

  it('handles empty levels array gracefully', () => {
    const emptyLevels: QualityLevel[] = [];
    const { result } = renderHook(() =>
      useQualityMonitor({ currentLevel: 0, preferredLevel: 1, levels: emptyLevels }),
    );
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.toast).not.toBeNull();
    expect(result.current.toast?.level).toBe('Level 0');
  });

  it('shows additional downgrade toast on further quality drops', () => {
    const { result, rerender } = renderHook(
      ({ currentLevel }) => useQualityMonitor({ currentLevel, preferredLevel: 3, levels: mockLevels }),
      { initialProps: { currentLevel: 2 } },
    );
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.toast?.type).toBe('downgrade');
    expect(result.current.toast?.level).toBe('1080p');
    rerender({ currentLevel: 0 });
    expect(result.current.toast?.type).toBe('downgrade');
    expect(result.current.toast?.level).toBe('360p');
  });

  it('clears timers when quality recovers before threshold', () => {
    const { result, rerender } = renderHook(
      ({ currentLevel }) => useQualityMonitor({ currentLevel, preferredLevel: 2, levels: mockLevels }),
      { initialProps: { currentLevel: 1 } },
    );
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.toast).toBeNull();
    rerender({ currentLevel: 2 });
    expect(result.current.toast?.type).toBe('recovery');
  });
});
