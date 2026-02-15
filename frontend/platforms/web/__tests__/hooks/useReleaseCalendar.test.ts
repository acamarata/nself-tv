import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReleaseCalendar } from '@/hooks/useReleaseCalendar';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import type { CalendarEntry, MovieMonitoring } from '@/types/acquisition';

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

const mockGetCalendar = vi.mocked(AcquisitionClient.getCalendar);

const mockMovie1: MovieMonitoring = {
  id: 'movie-1',
  familyId: 'family-123',
  title: 'Upcoming Blockbuster',
  tmdbId: 'tmdb-100',
  releaseDate: '2026-03-15',
  status: 'monitoring',
  qualityProfile: '4k_premium',
  posterUrl: 'https://example.com/poster1.jpg',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
};

const mockMovie2: MovieMonitoring = {
  id: 'movie-2',
  familyId: 'family-123',
  title: 'Indie Film',
  tmdbId: 'tmdb-200',
  releaseDate: '2026-03-22',
  status: 'monitoring',
  qualityProfile: 'balanced',
  posterUrl: null,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-02-10T00:00:00Z',
};

const mockCalendarEntries: CalendarEntry[] = [
  {
    date: '2026-03-15',
    movies: [mockMovie1],
  },
  {
    date: '2026-03-22',
    movies: [mockMovie2],
  },
];

describe('useReleaseCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCalendar.mockResolvedValue(mockCalendarEntries);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty entries and not loading', () => {
      const { result } = renderHook(() => useReleaseCalendar());

      // useReleaseCalendar starts with isLoading = false (no auto-fetch on mount)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.entries).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch data on mount', () => {
      renderHook(() => useReleaseCalendar());

      // No automatic fetch -- user must explicitly call fetchMonth
      expect(mockGetCalendar).not.toHaveBeenCalled();
    });
  });

  describe('fetchMonth', () => {
    it('should fetch calendar entries for a specific month', async () => {
      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-03');
      });

      expect(mockGetCalendar).toHaveBeenCalledWith(
        'family-123',
        '2026-03',
        expect.any(String),
      );
      expect(result.current.entries).toEqual(mockCalendarEntries);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: CalendarEntry[]) => void;
      mockGetCalendar.mockImplementation(
        () => new Promise<CalendarEntry[]>((resolve) => { resolvePromise = resolve; }),
      );

      const { result } = renderHook(() => useReleaseCalendar());

      // Start fetch without act to avoid flushing all microtasks
      let fetchPromise: Promise<void>;
      act(() => {
        fetchPromise = result.current.fetchMonth('2026-03');
      });

      // isLoading should be true immediately after calling fetchMonth
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockCalendarEntries);
        await fetchPromise!;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.entries).toEqual(mockCalendarEntries);
    });

    it('should handle fetch error', async () => {
      mockGetCalendar.mockRejectedValue(new Error('Calendar service down'));
      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-03');
      });

      expect(result.current.error).toBe('Calendar service down');
      expect(result.current.entries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error rejection with default message', async () => {
      mockGetCalendar.mockRejectedValue(null);
      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-04');
      });

      expect(result.current.error).toBe('Failed to fetch calendar');
    });

    it('should clear previous error when fetching again', async () => {
      mockGetCalendar.mockRejectedValueOnce(new Error('Temporary'));
      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-03');
      });

      expect(result.current.error).toBe('Temporary');

      mockGetCalendar.mockResolvedValue(mockCalendarEntries);

      await act(async () => {
        await result.current.fetchMonth('2026-03');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.entries).toEqual(mockCalendarEntries);
    });

    it('should replace entries when fetching a different month', async () => {
      const marchEntries: CalendarEntry[] = [
        { date: '2026-03-01', movies: [mockMovie1] },
      ];
      const aprilEntries: CalendarEntry[] = [
        { date: '2026-04-10', movies: [mockMovie2] },
      ];

      mockGetCalendar
        .mockResolvedValueOnce(marchEntries)
        .mockResolvedValueOnce(aprilEntries);

      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-03');
      });

      expect(result.current.entries).toEqual(marchEntries);

      await act(async () => {
        await result.current.fetchMonth('2026-04');
      });

      expect(result.current.entries).toEqual(aprilEntries);
      expect(mockGetCalendar).toHaveBeenCalledTimes(2);
    });

    it('should handle empty calendar month', async () => {
      mockGetCalendar.mockResolvedValue([]);
      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-12');
      });

      expect(result.current.entries).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle month with multiple movies on same date', async () => {
      const denseEntries: CalendarEntry[] = [
        {
          date: '2026-05-01',
          movies: [mockMovie1, mockMovie2],
        },
      ];
      mockGetCalendar.mockResolvedValue(denseEntries);

      const { result } = renderHook(() => useReleaseCalendar());

      await act(async () => {
        await result.current.fetchMonth('2026-05');
      });

      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].movies).toHaveLength(2);
    });
  });

  describe('no auto-refresh', () => {
    it('should not have any interval-based refresh', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      try {
        const { result } = renderHook(() => useReleaseCalendar());

        await act(async () => {
          await result.current.fetchMonth('2026-03');
        });

        expect(mockGetCalendar).toHaveBeenCalledTimes(1);

        mockGetCalendar.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(300000); // 5 minutes
        });

        expect(mockGetCalendar).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
