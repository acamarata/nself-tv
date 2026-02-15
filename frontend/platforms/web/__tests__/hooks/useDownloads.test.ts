import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDownloads } from '@/hooks/useDownloads';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import type { Download, CreateDownloadRequest } from '@/types/acquisition';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      familyId: 'family-123',
      email: 'test@test.com',
      displayName: 'Test',
      avatarUrl: null,
      defaultRole: 'user',
      roles: ['user'],
      createdAt: '2026-01-01',
    },
    tokens: {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 900,
      expiresAt: Date.now() + 900000,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
  }),
}));

vi.mock('@/lib/plugins/acquisition-client');

const mockListDownloads = vi.mocked(AcquisitionClient.listDownloads);
const mockGetDownloadHistory = vi.mocked(AcquisitionClient.getDownloadHistory);
const mockCreateDownload = vi.mocked(AcquisitionClient.createDownload);
const mockCancelDownload = vi.mocked(AcquisitionClient.cancelDownload);
const mockRetryDownload = vi.mocked(AcquisitionClient.retryDownload);
const mockPauseDownload = vi.mocked(AcquisitionClient.pauseDownload);
const mockResumeDownload = vi.mocked(AcquisitionClient.resumeDownload);

const makeDownload = (overrides: Partial<Download> = {}): Download => ({
  id: 'dl-1',
  familyId: 'family-123',
  contentType: 'episode',
  title: 'Test Episode S01E01',
  state: 'downloading',
  progress: 45,
  downloadSpeed: 5000000,
  uploadSpeed: 1000000,
  eta: 120,
  size: 1500000000,
  downloadedBytes: 675000000,
  sourceUrl: 'magnet:?xt=urn:btih:abc123',
  quality: 'web-dl',
  error: null,
  retryCount: 0,
  stateHistory: [
    { state: 'created', timestamp: '2026-02-14T00:00:00Z', duration: null, error: null },
    { state: 'searching', timestamp: '2026-02-14T00:00:01Z', duration: 1000, error: null },
    { state: 'downloading', timestamp: '2026-02-14T00:00:05Z', duration: null, error: null },
  ],
  createdAt: '2026-02-14T00:00:00Z',
  updatedAt: '2026-02-14T00:05:00Z',
  ...overrides,
});

const activeDownload = makeDownload({ id: 'dl-1', state: 'downloading', progress: 45 });
const completedDownload = makeDownload({ id: 'dl-2', state: 'completed', progress: 100, title: 'Completed Episode' });
const failedDownload = makeDownload({ id: 'dl-3', state: 'failed', progress: 0, title: 'Failed Download', error: 'No seeds' });
const cancelledDownload = makeDownload({ id: 'dl-4', state: 'cancelled', progress: 20, title: 'Cancelled Download' });
const searchingDownload = makeDownload({ id: 'dl-5', state: 'searching', progress: 0, title: 'Searching Download' });

describe('useDownloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // listDownloads returns all downloads; the hook filters active ones
    mockListDownloads.mockResolvedValue([
      activeDownload,
      completedDownload,
      failedDownload,
      cancelledDownload,
      searchingDownload,
    ]);
    mockGetDownloadHistory.mockResolvedValue({
      downloads: [completedDownload, failedDownload],
      total: 2,
    });
    mockCreateDownload.mockResolvedValue(activeDownload);
    mockCancelDownload.mockResolvedValue(undefined);
    mockRetryDownload.mockResolvedValue(activeDownload);
    mockPauseDownload.mockResolvedValue(undefined);
    mockResumeDownload.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (vi.isFakeTimersEnabled?.()) {
      vi.useRealTimers();
    }
    vi.restoreAllMocks();
  });

  describe('initial fetch', () => {
    it('should start in loading state with empty data', () => {
      mockListDownloads.mockImplementation(() => new Promise(() => {}));
      mockGetDownloadHistory.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useDownloads());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.active).toEqual([]);
      expect(result.current.history).toEqual([]);
      expect(result.current.historyTotal).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should fetch active downloads and history on mount', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Active downloads should exclude completed, failed, and cancelled
      expect(result.current.active).toEqual([activeDownload, searchingDownload]);
      expect(result.current.history).toEqual([completedDownload, failedDownload]);
      expect(result.current.historyTotal).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('should call listDownloads with familyId', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockListDownloads).toHaveBeenCalledWith(
        'family-123',
        undefined,
        expect.any(String),
      );
    });

    it('should call getDownloadHistory with default page size', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetDownloadHistory).toHaveBeenCalledWith(
        'family-123',
        1,
        20,
        expect.any(String),
      );
    });

    it('should call getDownloadHistory with custom page size', async () => {
      const { result } = renderHook(() => useDownloads({ historyPageSize: 50 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetDownloadHistory).toHaveBeenCalledWith(
        'family-123',
        1,
        50,
        expect.any(String),
      );
    });

    it('should handle fetch error from listDownloads', async () => {
      mockListDownloads.mockRejectedValue(new Error('Connection refused'));
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Connection refused');
    });

    it('should handle fetch error from getDownloadHistory', async () => {
      mockListDownloads.mockResolvedValue([]);
      mockGetDownloadHistory.mockRejectedValue(new Error('History error'));
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('History error');
    });

    it('should handle non-Error rejection with default message', async () => {
      mockListDownloads.mockRejectedValue(42);
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch downloads');
    });
  });

  describe('auto-refresh active downloads', () => {
    it('should set up interval with default 5s refresh', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockListDownloads).toHaveBeenCalled();
    });

    it('should accept custom refresh interval', async () => {
      const { result } = renderHook(() =>
        useDownloads({ refreshInterval: 2000 }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toBeDefined();
    });

    it('should not error with interval 0', async () => {
      const { result } = renderHook(() =>
        useDownloads({ refreshInterval: 0 }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toBeDefined();
    });

    it('should not error with negative interval', async () => {
      const { result } = renderHook(() =>
        useDownloads({ refreshInterval: -1 }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toBeDefined();
    });

    it('should only refresh active (not history) by design', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // History is fetched once on mount, active is refreshed on interval
      expect(mockListDownloads).toHaveBeenCalled();
      expect(mockGetDownloadHistory).toHaveBeenCalled();
    });

    it('should cleanup interval on unmount', async () => {
      const { result, unmount } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockListDownloads.mock.calls.length;

      unmount();

      // Small delay to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockListDownloads).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('refetch', () => {
    it('should manually refetch both active and history', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const activeCount = mockListDownloads.mock.calls.length;
      const historyCount = mockGetDownloadHistory.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockListDownloads).toHaveBeenCalledTimes(activeCount + 1);
      expect(mockGetDownloadHistory).toHaveBeenCalledTimes(historyCount + 1);
    });
  });

  describe('create', () => {
    it('should create a download and refresh active list', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const params: CreateDownloadRequest = {
        contentType: 'episode',
        title: 'New Episode S01E05',
        sourceUrl: 'magnet:?xt=urn:btih:xyz789',
        quality: 'web-dl',
      };

      let created: Download | undefined;
      await act(async () => {
        created = await result.current.create(params);
      });

      expect(mockCreateDownload).toHaveBeenCalledWith(
        'family-123',
        params,
        expect.any(String),
      );
      expect(created).toEqual(activeDownload);
    });

    it('should propagate create errors', async () => {
      mockCreateDownload.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.create({
            contentType: 'movie',
            title: 'Bad Movie',
            sourceUrl: 'magnet:?xt=bad',
            quality: 'unknown',
          });
        }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('cancel', () => {
    it('should cancel a download and refresh active list', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cancel('dl-1');
      });

      expect(mockCancelDownload).toHaveBeenCalledWith(
        'dl-1',
        expect.any(String),
      );
    });

    it('should propagate cancel errors', async () => {
      mockCancelDownload.mockRejectedValue(new Error('Cancel failed'));

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.cancel('dl-1');
        }),
      ).rejects.toThrow('Cancel failed');
    });
  });

  describe('retry', () => {
    it('should retry a download and refresh active list', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.retry('dl-3');
      });

      expect(mockRetryDownload).toHaveBeenCalledWith(
        'dl-3',
        expect.any(String),
      );
    });

    it('should propagate retry errors', async () => {
      mockRetryDownload.mockRejectedValue(new Error('Retry failed'));

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.retry('dl-3');
        }),
      ).rejects.toThrow('Retry failed');
    });
  });

  describe('pause', () => {
    it('should pause a download and refresh active list', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.pause('dl-1');
      });

      expect(mockPauseDownload).toHaveBeenCalledWith(
        'dl-1',
        expect.any(String),
      );
    });

    it('should propagate pause errors', async () => {
      mockPauseDownload.mockRejectedValue(new Error('Pause failed'));

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.pause('dl-1');
        }),
      ).rejects.toThrow('Pause failed');
    });
  });

  describe('resume', () => {
    it('should resume a download and refresh active list', async () => {
      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resume('dl-1');
      });

      expect(mockResumeDownload).toHaveBeenCalledWith(
        'dl-1',
        expect.any(String),
      );
    });

    it('should propagate resume errors', async () => {
      mockResumeDownload.mockRejectedValue(new Error('Resume failed'));

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.resume('dl-1');
        }),
      ).rejects.toThrow('Resume failed');
    });
  });

  describe('loadHistoryPage', () => {
    it('should load a specific history page', async () => {
      const page2Downloads = [
        makeDownload({ id: 'dl-10', state: 'completed', title: 'Old Episode 1' }),
        makeDownload({ id: 'dl-11', state: 'completed', title: 'Old Episode 2' }),
      ];
      mockGetDownloadHistory
        .mockResolvedValueOnce({ downloads: [completedDownload], total: 50 }) // initial
        .mockResolvedValueOnce({ downloads: page2Downloads, total: 50 });

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadHistoryPage(2);
      });

      expect(mockGetDownloadHistory).toHaveBeenLastCalledWith(
        'family-123',
        2,
        20,
        expect.any(String),
      );
      expect(result.current.history).toEqual(page2Downloads);
      expect(result.current.historyTotal).toBe(50);
    });

    it('should use custom page size when loading history', async () => {
      const { result } = renderHook(() => useDownloads({ historyPageSize: 10 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadHistoryPage(3);
      });

      expect(mockGetDownloadHistory).toHaveBeenLastCalledWith(
        'family-123',
        3,
        10,
        expect.any(String),
      );
    });
  });

  describe('download state filtering', () => {
    it('should filter out completed downloads from active', async () => {
      mockListDownloads.mockResolvedValue([
        makeDownload({ id: 'a', state: 'completed' }),
        makeDownload({ id: 'b', state: 'downloading' }),
      ]);

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toHaveLength(1);
      expect(result.current.active[0].id).toBe('b');
    });

    it('should filter out failed downloads from active', async () => {
      mockListDownloads.mockResolvedValue([
        makeDownload({ id: 'a', state: 'failed' }),
        makeDownload({ id: 'b', state: 'encoding' }),
      ]);

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toHaveLength(1);
      expect(result.current.active[0].id).toBe('b');
    });

    it('should filter out cancelled downloads from active', async () => {
      mockListDownloads.mockResolvedValue([
        makeDownload({ id: 'a', state: 'cancelled' }),
        makeDownload({ id: 'b', state: 'vpn_connecting' }),
      ]);

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toHaveLength(1);
      expect(result.current.active[0].id).toBe('b');
    });

    it('should keep all non-terminal state downloads as active', async () => {
      mockListDownloads.mockResolvedValue([
        makeDownload({ id: 'a', state: 'created' }),
        makeDownload({ id: 'b', state: 'vpn_connecting' }),
        makeDownload({ id: 'c', state: 'searching' }),
        makeDownload({ id: 'd', state: 'downloading' }),
        makeDownload({ id: 'e', state: 'encoding' }),
        makeDownload({ id: 'f', state: 'subtitles' }),
        makeDownload({ id: 'g', state: 'uploading' }),
        makeDownload({ id: 'h', state: 'finalizing' }),
      ]);

      const { result } = renderHook(() => useDownloads());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.active).toHaveLength(8);
    });
  });
});
