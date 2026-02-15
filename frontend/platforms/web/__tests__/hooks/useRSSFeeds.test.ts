import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRSSFeeds } from '@/hooks/useRSSFeeds';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import type { RSSFeed, FeedValidation } from '@/types/acquisition';

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

const mockListFeeds = vi.mocked(AcquisitionClient.listFeeds);
const mockAddFeed = vi.mocked(AcquisitionClient.addFeed);
const mockValidateFeed = vi.mocked(AcquisitionClient.validateFeed);
const mockDeleteFeed = vi.mocked(AcquisitionClient.deleteFeed);

const mockFeed: RSSFeed = {
  id: 'feed-1',
  title: 'Test RSS Feed',
  url: 'https://example.com/rss',
  status: 'active',
  lastChecked: '2026-02-14T00:00:00Z',
  errorCount: 0,
  itemCount: 42,
  checkIntervalMinutes: 30,
  createdAt: '2026-01-01T00:00:00Z',
};

const mockFeed2: RSSFeed = {
  id: 'feed-2',
  title: 'Another Feed',
  url: 'https://example.com/rss2',
  status: 'error',
  lastChecked: '2026-02-13T00:00:00Z',
  errorCount: 3,
  itemCount: 0,
  checkIntervalMinutes: 60,
  createdAt: '2026-01-15T00:00:00Z',
};

describe('useRSSFeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFeeds.mockResolvedValue([mockFeed, mockFeed2]);
    mockAddFeed.mockResolvedValue(mockFeed);
    mockDeleteFeed.mockResolvedValue(undefined);
    mockValidateFeed.mockResolvedValue({
      valid: true,
      title: 'Valid Feed',
      itemCount: 10,
      sampleItems: [],
      errors: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial fetch', () => {
    it('should start in loading state with empty feeds', () => {
      mockListFeeds.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useRSSFeeds());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.feeds).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch feeds on mount', async () => {
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockListFeeds).toHaveBeenCalledWith(
        'family-123',
        expect.any(String),
      );
      expect(result.current.feeds).toEqual([mockFeed, mockFeed2]);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockListFeeds.mockRejectedValue(new Error('Fetch failed'));
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.feeds).toEqual([]);
    });

    it('should handle non-Error rejection with default message', async () => {
      mockListFeeds.mockRejectedValue(null);
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch RSS feeds');
    });
  });

  describe('auto-refresh', () => {
    it('should refresh at default 60s interval', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() => useRSSFeeds());

        // Let microtasks and initial effect run, but don't run the interval yet
        await act(async () => {
          await Promise.resolve();
          // Don't call runOnlyPendingTimers - let shouldAdvanceTime handle it
        });

        expect(mockListFeeds).toHaveBeenCalledTimes(1);
        mockListFeeds.mockClear();

        // Advance by the interval
        await act(async () => {
          vi.advanceTimersByTime(60000);
        });

        expect(mockListFeeds).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should refresh at custom interval', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useRSSFeeds({ refreshInterval: 15000 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockListFeeds.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(15000);
        });

        expect(mockListFeeds).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not auto-refresh when interval is 0', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useRSSFeeds({ refreshInterval: 0 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockListFeeds.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(120000);
        });

        expect(mockListFeeds).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not auto-refresh when interval is negative', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result } = renderHook(() =>
          useRSSFeeds({ refreshInterval: -10 }),
        );

        await act(async () => {
          await Promise.resolve();
        });

        mockListFeeds.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(120000);
        });

        expect(mockListFeeds).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should clear interval on unmount', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { result, unmount } = renderHook(() => useRSSFeeds());

        await act(async () => {
          await Promise.resolve();
        });

        unmount();

        mockListFeeds.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(120000);
        });

        expect(mockListFeeds).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('refetch', () => {
    it('should manually refetch data', async () => {
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockListFeeds).toHaveBeenCalledTimes(2);
    });

    it('should clear previous error on refetch', async () => {
      mockListFeeds.mockRejectedValueOnce(new Error('Temporary'));
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.error).toBe('Temporary');
      });

      mockListFeeds.mockResolvedValue([mockFeed]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.feeds).toEqual([mockFeed]);
    });
  });

  describe('add', () => {
    it('should add a feed and refetch', async () => {
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newFeed: RSSFeed | undefined;
      await act(async () => {
        newFeed = await result.current.add('https://example.com/new-feed.xml');
      });

      expect(mockAddFeed).toHaveBeenCalledWith(
        'family-123',
        'https://example.com/new-feed.xml',
        expect.any(String),
      );
      expect(newFeed).toEqual(mockFeed);
      expect(mockListFeeds).toHaveBeenCalledTimes(2);
    });

    it('should propagate add errors', async () => {
      mockAddFeed.mockRejectedValue(new Error('Invalid URL'));

      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.add('not-a-url');
        }),
      ).rejects.toThrow('Invalid URL');
    });
  });

  describe('validate', () => {
    it('should validate a feed URL', async () => {
      const validation: FeedValidation = {
        valid: true,
        title: 'Great Feed',
        itemCount: 25,
        sampleItems: [
          {
            title: 'Sample Item 1',
            publishedAt: '2026-02-14T00:00:00Z',
            magnetUri: 'magnet:?xt=urn:btih:abc',
            size: 1500000000,
            quality: 'web-dl',
            season: 1,
            episode: 1,
          },
        ],
        errors: [],
      };
      mockValidateFeed.mockResolvedValue(validation);

      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let validationResult: FeedValidation | undefined;
      await act(async () => {
        validationResult = await result.current.validate('https://example.com/check.xml');
      });

      expect(mockValidateFeed).toHaveBeenCalledWith(
        'https://example.com/check.xml',
        expect.any(String),
      );
      expect(validationResult).toEqual(validation);
    });

    it('should return invalid validation for bad feeds', async () => {
      const invalidResult: FeedValidation = {
        valid: false,
        title: null,
        itemCount: 0,
        sampleItems: [],
        errors: ['Not a valid RSS feed', 'Missing required elements'],
      };
      mockValidateFeed.mockResolvedValue(invalidResult);

      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let validationResult: FeedValidation | undefined;
      await act(async () => {
        validationResult = await result.current.validate('https://example.com/bad.xml');
      });

      expect(validationResult?.valid).toBe(false);
      expect(validationResult?.errors).toHaveLength(2);
    });

    it('should not require familyId for validation', async () => {
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.validate('https://example.com/test.xml');
      });

      // validate does not pass familyId
      expect(mockValidateFeed).toHaveBeenCalledWith(
        'https://example.com/test.xml',
        expect.any(String),
      );
    });

    it('should propagate validation errors', async () => {
      mockValidateFeed.mockRejectedValue(new Error('Validation service down'));

      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.validate('https://example.com/test.xml');
        }),
      ).rejects.toThrow('Validation service down');
    });
  });

  describe('remove', () => {
    it('should delete a feed and refetch', async () => {
      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.remove('feed-1');
      });

      expect(mockDeleteFeed).toHaveBeenCalledWith(
        'feed-1',
        expect.any(String),
      );
      expect(mockListFeeds).toHaveBeenCalledTimes(2);
    });

    it('should propagate delete errors', async () => {
      mockDeleteFeed.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useRSSFeeds());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.remove('feed-1');
        }),
      ).rejects.toThrow('Delete failed');
    });
  });
});
