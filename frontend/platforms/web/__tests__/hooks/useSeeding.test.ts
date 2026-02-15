import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSeeding } from '@/hooks/useSeeding';
import * as TorrentClient from '@/lib/plugins/torrent-client';
import type { SeedingStats, SeedingAggregate } from '@/types/acquisition';

// useSeeding does NOT depend on useAuth -- no familyId needed
vi.mock('@/lib/plugins/torrent-client');

const mockGetSeedingStats = vi.mocked(TorrentClient.getSeedingStats);
const mockGetSeedingAggregate = vi.mocked(TorrentClient.getSeedingAggregate);
const mockUpdateSeedingPolicy = vi.mocked(TorrentClient.updateSeedingPolicy);

const mockStat1: SeedingStats = {
  id: 'seed-1',
  torrentHash: 'hash-abc123',
  name: 'Test Show S01E01',
  ratio: 2.5,
  uploaded: 5000000000,
  downloaded: 2000000000,
  seedingDuration: 86400,
  isFavorite: false,
  seedRatioLimit: 3.0,
  seedTimeLimitMinutes: 1440,
};

const mockStat2: SeedingStats = {
  id: 'seed-2',
  torrentHash: 'hash-def456',
  name: 'Movie 2026',
  ratio: 1.1,
  uploaded: 1500000000,
  downloaded: 1400000000,
  seedingDuration: 3600,
  isFavorite: true,
  seedRatioLimit: 5.0,
  seedTimeLimitMinutes: 0,
};

const mockAggregate: SeedingAggregate = {
  totalUploaded: 6500000000,
  totalDownloaded: 3400000000,
  averageRatio: 1.91,
  activeTorrents: 2,
  completedTorrents: 15,
};

describe('useSeeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSeedingStats.mockResolvedValue([mockStat1, mockStat2]);
    mockGetSeedingAggregate.mockResolvedValue(mockAggregate);
    mockUpdateSeedingPolicy.mockResolvedValue(mockStat1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial fetch', () => {
    it('should start in loading state with empty data', () => {
      mockGetSeedingStats.mockImplementation(() => new Promise(() => {}));
      mockGetSeedingAggregate.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useSeeding());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toEqual([]);
      expect(result.current.aggregate).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should fetch seeding stats and aggregate on mount', async () => {
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetSeedingStats).toHaveBeenCalledWith(expect.any(String));
      expect(mockGetSeedingAggregate).toHaveBeenCalledWith(expect.any(String));
      expect(result.current.stats).toEqual([mockStat1, mockStat2]);
      expect(result.current.aggregate).toEqual(mockAggregate);
      expect(result.current.error).toBeNull();
    });

    it('should fetch both stats and aggregate in parallel', async () => {
      // Verify that both are called without waiting for each other
      let statsResolved = false;
      let aggResolved = false;

      mockGetSeedingStats.mockImplementation(async () => {
        statsResolved = true;
        return [mockStat1];
      });
      mockGetSeedingAggregate.mockImplementation(async () => {
        aggResolved = true;
        return mockAggregate;
      });

      renderHook(() => useSeeding());

      await waitFor(() => {
        expect(statsResolved).toBe(true);
        expect(aggResolved).toBe(true);
      });
    });

    it('should handle fetch error from stats', async () => {
      mockGetSeedingStats.mockRejectedValue(new Error('Stats error'));
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Stats error');
      expect(result.current.stats).toEqual([]);
      expect(result.current.aggregate).toBeNull();
    });

    it('should handle fetch error from aggregate', async () => {
      mockGetSeedingAggregate.mockRejectedValue(new Error('Aggregate error'));
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Aggregate error');
    });

    it('should handle non-Error rejection with default message', async () => {
      mockGetSeedingStats.mockRejectedValue({ status: 500 });
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch seeding data');
    });
  });

  describe('auto-refresh', () => {
    it('should refresh at default 30s interval', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() => useSeeding());

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockGetSeedingStats).toHaveBeenCalledTimes(1);
        expect(mockGetSeedingAggregate).toHaveBeenCalledTimes(1);

        mockGetSeedingStats.mockClear();
        mockGetSeedingAggregate.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(30000);
        });

        expect(mockGetSeedingStats).toHaveBeenCalledTimes(1);
        expect(mockGetSeedingAggregate).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should refresh at custom interval', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useSeeding({ refreshInterval: 10000 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockGetSeedingStats.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(10000);
        });

        expect(mockGetSeedingStats).toHaveBeenCalledTimes(1);

        mockGetSeedingStats.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(10000);
        });

        expect(mockGetSeedingStats).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not auto-refresh when interval is 0', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useSeeding({ refreshInterval: 0 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockGetSeedingStats.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(120000);
        });

        expect(mockGetSeedingStats).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not auto-refresh when interval is negative', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useSeeding({ refreshInterval: -1 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockGetSeedingStats.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(120000);
        });

        expect(mockGetSeedingStats).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should clear interval on unmount', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result, unmount } = renderHook(() => useSeeding());

        await act(async () => {
          await Promise.resolve();
        });

        unmount();

        mockGetSeedingStats.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(60000);
        });

        expect(mockGetSeedingStats).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('refetch', () => {
    it('should manually refetch both stats and aggregate', async () => {
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSeedingStats).toHaveBeenCalledTimes(2);
      expect(mockGetSeedingAggregate).toHaveBeenCalledTimes(2);
    });

    it('should clear previous error on refetch', async () => {
      mockGetSeedingStats.mockRejectedValueOnce(new Error('Transient'));
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.error).toBe('Transient');
      });

      mockGetSeedingStats.mockResolvedValue([mockStat1]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.stats).toEqual([mockStat1]);
      expect(result.current.aggregate).toEqual(mockAggregate);
    });
  });

  describe('updatePolicy', () => {
    it('should update seeding policy and refetch', async () => {
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const policy = { seedRatioLimit: 5.0, isFavorite: true };

      await act(async () => {
        await result.current.updatePolicy('hash-abc123', policy);
      });

      expect(mockUpdateSeedingPolicy).toHaveBeenCalledWith(
        'hash-abc123',
        policy,
        expect.any(String),
      );
      // Should have refetched after update
      expect(mockGetSeedingStats).toHaveBeenCalledTimes(2);
      expect(mockGetSeedingAggregate).toHaveBeenCalledTimes(2);
    });

    it('should update with seedTimeLimitMinutes', async () => {
      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const policy = { seedTimeLimitMinutes: 2880 };

      await act(async () => {
        await result.current.updatePolicy('hash-def456', policy);
      });

      expect(mockUpdateSeedingPolicy).toHaveBeenCalledWith(
        'hash-def456',
        policy,
        expect.any(String),
      );
    });

    it('should propagate updatePolicy errors', async () => {
      mockUpdateSeedingPolicy.mockRejectedValue(new Error('Policy update failed'));

      const { result } = renderHook(() => useSeeding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updatePolicy('hash-abc123', { seedRatioLimit: 10 });
        }),
      ).rejects.toThrow('Policy update failed');
    });
  });
});
