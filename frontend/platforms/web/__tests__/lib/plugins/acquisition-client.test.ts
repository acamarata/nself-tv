import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDashboard,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  listMonitoredMovies,
  monitorMovie,
  unmonitorMovie,
  getCalendar,
  listFeeds,
  addFeed,
  validateFeed,
  deleteFeed,
  listDownloads,
  createDownload,
  cancelDownload,
  retryDownload,
  pauseDownload,
  resumeDownload,
  getDownloadHistory,
  listRules,
  createRule,
  updateRule,
  deleteRule,
  testRule,
  getRecentActivity,
} from '@/lib/plugins/acquisition-client';
import type {
  AcquisitionDashboard,
  TVSubscription,
  SubscribeRequest,
  MovieMonitoring,
  CalendarEntry,
  RSSFeed,
  FeedValidation,
  Download,
  CreateDownloadRequest,
  DownloadRule,
  CreateRuleRequest,
  ActivityEntry,
} from '@/types/acquisition';

const BASE = 'http://localhost:3202';

const mockDashboard: AcquisitionDashboard = {
  activeDownloads: 3,
  completedToday: 12,
  failedThisWeek: 1,
  activeSubscriptions: 8,
  recentActivity: [],
};

const mockSubscription: TVSubscription = {
  id: 'sub-001',
  familyId: 'fam-001',
  showName: 'Breaking Bad',
  feedUrl: 'https://feeds.example.com/bb',
  qualityProfile: 'balanced',
  autoDownload: true,
  status: 'active',
  lastChecked: '2026-02-14T10:00:00Z',
  nextCheck: '2026-02-14T11:00:00Z',
  episodeCount: 62,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-14T10:00:00Z',
};

const mockMovie: MovieMonitoring = {
  id: 'mov-001',
  familyId: 'fam-001',
  title: 'Inception',
  tmdbId: '27205',
  releaseDate: '2010-07-16',
  status: 'monitoring',
  qualityProfile: '4k_premium',
  posterUrl: 'http://example.com/poster.jpg',
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-02-14T00:00:00Z',
};

const mockCalendarEntry: CalendarEntry = {
  date: '2026-02-14',
  movies: [mockMovie],
};

const mockFeed: RSSFeed = {
  id: 'feed-001',
  title: 'Example Torrent Feed',
  url: 'https://feeds.example.com/rss',
  status: 'active',
  lastChecked: '2026-02-14T12:00:00Z',
  errorCount: 0,
  itemCount: 150,
  checkIntervalMinutes: 30,
  createdAt: '2026-01-01T00:00:00Z',
};

const mockFeedValidation: FeedValidation = {
  valid: true,
  title: 'Valid Feed',
  itemCount: 25,
  sampleItems: [
    {
      title: 'Sample.S01E01.720p',
      publishedAt: '2026-02-14T00:00:00Z',
      magnetUri: 'magnet:?xt=urn:btih:abc123',
      size: 1073741824,
      quality: 'web-dl',
      season: 1,
      episode: 1,
    },
  ],
  errors: [],
};

const mockDownload: Download = {
  id: 'dl-001',
  familyId: 'fam-001',
  contentType: 'episode',
  title: 'Breaking Bad S01E01',
  state: 'downloading',
  progress: 45.5,
  downloadSpeed: 5242880,
  uploadSpeed: 1048576,
  eta: 600,
  size: 1073741824,
  downloadedBytes: 488636416,
  sourceUrl: 'magnet:?xt=urn:btih:abc123',
  quality: 'web-dl',
  error: null,
  retryCount: 0,
  stateHistory: [
    { state: 'created', timestamp: '2026-02-14T10:00:00Z', duration: null, error: null },
    { state: 'downloading', timestamp: '2026-02-14T10:01:00Z', duration: null, error: null },
  ],
  createdAt: '2026-02-14T10:00:00Z',
  updatedAt: '2026-02-14T10:10:00Z',
};

const mockRule: DownloadRule = {
  id: 'rule-001',
  familyId: 'fam-001',
  name: 'Auto-download 4K',
  priority: 1,
  conditions: { quality: '4k_premium', minSeeders: 10 },
  action: 'auto_download',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-14T00:00:00Z',
};

const mockActivity: ActivityEntry = {
  id: 'act-001',
  type: 'download_complete',
  title: 'Breaking Bad S01E01 completed',
  timestamp: '2026-02-14T11:00:00Z',
  details: 'Downloaded in 10 minutes',
};

describe('acquisition-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -- Dashboard --

  describe('getDashboard', () => {
    it('sends GET with familyId query param and returns AcquisitionDashboard', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDashboard),
      });

      const result = await getDashboard('fam-001');

      expect(result).toEqual(mockDashboard);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/dashboard?familyId=fam-001`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDashboard),
      });

      await getDashboard('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/dashboard?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDashboard),
      });

      await getDashboard('fam-001', 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/dashboard?familyId=fam-001',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'unauthorized', message: 'Not authorized', statusCode: 401 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getDashboard('fam-001')).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getDashboard('fam-001')).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(getDashboard('fam-001')).rejects.toThrow('Network failure');
    });
  });

  // -- Subscriptions --

  describe('listSubscriptions', () => {
    it('sends GET with familyId and returns TVSubscription[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSubscription]),
      });

      const result = await listSubscriptions('fam-001');

      expect(result).toEqual([mockSubscription]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/subscriptions?familyId=fam-001`,
        expect.any(Object),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listSubscriptions('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/subscriptions?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'DB down', statusCode: 503 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listSubscriptions('fam-001')).rejects.toEqual(errorBody);
    });
  });

  describe('createSubscription', () => {
    const params: SubscribeRequest = {
      showName: 'Breaking Bad',
      feedUrl: 'https://feeds.example.com/bb',
      qualityProfile: 'balanced',
      autoDownload: true,
    };

    it('sends POST with familyId and params merged in body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSubscription),
      });

      const result = await createSubscription('fam-001', params);

      expect(result).toEqual(mockSubscription);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/subscriptions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', ...params }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSubscription),
      });

      await createSubscription('fam-001', params, 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/subscriptions',
        expect.any(Object),
      );
    });

    it('throws PluginError on conflict', async () => {
      const errorBody = { error: 'conflict', message: 'Already subscribed', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(createSubscription('fam-001', params)).rejects.toEqual(errorBody);
    });
  });

  describe('updateSubscription', () => {
    it('sends PATCH with partial params and returns updated TVSubscription', async () => {
      const updated = { ...mockSubscription, autoDownload: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const result = await updateSubscription('sub-001', { autoDownload: false });

      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/subscriptions/sub-001`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ autoDownload: false }),
        }),
      );
    });

    it('throws PluginError on 404', async () => {
      const errorBody = { error: 'not_found', message: 'Subscription not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(updateSubscription('nonexistent', { autoDownload: false })).rejects.toEqual(errorBody);
    });
  });

  describe('deleteSubscription', () => {
    it('sends DELETE and returns void for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await deleteSubscription('sub-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/subscriptions/sub-001`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      await deleteSubscription('sub-001', 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/subscriptions/sub-001',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(deleteSubscription('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  // -- Movie Monitoring --

  describe('listMonitoredMovies', () => {
    it('sends GET with familyId and returns MovieMonitoring[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockMovie]),
      });

      const result = await listMonitoredMovies('fam-001');

      expect(result).toEqual([mockMovie]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/movies?familyId=fam-001`,
        expect.any(Object),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listMonitoredMovies('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/movies?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Failed', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listMonitoredMovies('fam-001')).rejects.toEqual(errorBody);
    });
  });

  describe('monitorMovie', () => {
    const params = {
      title: 'Inception',
      tmdbId: '27205',
      qualityProfile: '4k_premium' as const,
    };

    it('sends POST with familyId and params merged in body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMovie),
      });

      const result = await monitorMovie('fam-001', params);

      expect(result).toEqual(mockMovie);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/movies`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', ...params }),
        }),
      );
    });

    it('throws PluginError on conflict', async () => {
      const errorBody = { error: 'conflict', message: 'Already monitoring', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(monitorMovie('fam-001', params)).rejects.toEqual(errorBody);
    });
  });

  describe('unmonitorMovie', () => {
    it('sends DELETE and returns void for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await unmonitorMovie('mov-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/movies/mov-001`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Movie not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(unmonitorMovie('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  describe('getCalendar', () => {
    it('sends GET with familyId and month query params', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockCalendarEntry]),
      });

      const result = await getCalendar('fam-001', '2026-02');

      expect(result).toEqual([mockCalendarEntry]);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/acquisition/calendar?');
      expect(calledUrl).toContain('familyId=fam-001');
      expect(calledUrl).toContain('month=2026-02');
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getCalendar('fam-001', '2026-03', 'http://custom:9999');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('http://custom:9999/api/v1/acquisition/calendar?');
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'Invalid month', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getCalendar('fam-001', 'invalid')).rejects.toEqual(errorBody);
    });
  });

  // -- RSS Feeds --

  describe('listFeeds', () => {
    it('sends GET with familyId and returns RSSFeed[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockFeed]),
      });

      const result = await listFeeds('fam-001');

      expect(result).toEqual([mockFeed]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/feeds?familyId=fam-001`,
        expect.any(Object),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listFeeds('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/feeds?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'DB error', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listFeeds('fam-001')).rejects.toEqual(errorBody);
    });
  });

  describe('addFeed', () => {
    it('sends POST with familyId and url in body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFeed),
      });

      const result = await addFeed('fam-001', 'https://feeds.example.com/rss');

      expect(result).toEqual(mockFeed);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/feeds`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', url: 'https://feeds.example.com/rss' }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFeed),
      });

      await addFeed('fam-001', 'https://feeds.example.com/rss', 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/feeds',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'Invalid feed URL', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(addFeed('fam-001', 'not-a-url')).rejects.toEqual(errorBody);
    });
  });

  describe('validateFeed', () => {
    it('sends POST with url in body and returns FeedValidation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFeedValidation),
      });

      const result = await validateFeed('https://feeds.example.com/rss');

      expect(result).toEqual(mockFeedValidation);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/feeds/validate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'https://feeds.example.com/rss' }),
        }),
      );
    });

    it('returns invalid validation for bad feeds', async () => {
      const invalid: FeedValidation = {
        valid: false,
        title: null,
        itemCount: 0,
        sampleItems: [],
        errors: ['Not a valid RSS/Atom feed'],
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalid),
      });

      const result = await validateFeed('https://not-a-feed.com');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Not a valid RSS/Atom feed');
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'URL unreachable', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(validateFeed('https://unreachable.com')).rejects.toEqual(errorBody);
    });
  });

  describe('deleteFeed', () => {
    it('sends DELETE and returns void for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await deleteFeed('feed-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/feeds/feed-001`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Feed not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(deleteFeed('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  // -- Downloads --

  describe('listDownloads', () => {
    it('sends GET with familyId and returns Download[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockDownload]),
      });

      const result = await listDownloads('fam-001');

      expect(result).toEqual([mockDownload]);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/acquisition/downloads?');
      expect(calledUrl).toContain('familyId=fam-001');
    });

    it('includes optional status query parameter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockDownload]),
      });

      await listDownloads('fam-001', 'downloading');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('familyId=fam-001');
      expect(calledUrl).toContain('status=downloading');
    });

    it('omits status param when not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listDownloads('fam-001');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('status=');
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Timeout', statusCode: 504 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        statusText: 'Gateway Timeout',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listDownloads('fam-001')).rejects.toEqual(errorBody);
    });
  });

  describe('createDownload', () => {
    const params: CreateDownloadRequest = {
      contentType: 'episode',
      title: 'Breaking Bad S01E01',
      sourceUrl: 'magnet:?xt=urn:btih:abc123',
      quality: 'web-dl',
    };

    it('sends POST with familyId and params merged in body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDownload),
      });

      const result = await createDownload('fam-001', params);

      expect(result).toEqual(mockDownload);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/downloads`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', ...params }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDownload),
      });

      await createDownload('fam-001', params, 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/downloads',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'Invalid source URL', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(createDownload('fam-001', params)).rejects.toEqual(errorBody);
    });
  });

  describe('cancelDownload', () => {
    it('sends POST to cancel endpoint and returns void for 204', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await cancelDownload('dl-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/downloads/dl-001/cancel`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Download not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(cancelDownload('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  describe('retryDownload', () => {
    it('sends POST to retry endpoint and returns Download', async () => {
      const retried = { ...mockDownload, state: 'created' as const, retryCount: 1 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(retried),
      });

      const result = await retryDownload('dl-001');

      expect(result).toEqual(retried);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/downloads/dl-001/retry`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDownload),
      });

      await retryDownload('dl-001', 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/downloads/dl-001/retry',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'Max retries exceeded', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(retryDownload('dl-001')).rejects.toEqual(errorBody);
    });
  });

  describe('pauseDownload', () => {
    it('sends POST to pause endpoint and returns void for 204', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await pauseDownload('dl-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/downloads/dl-001/pause`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'conflict', message: 'Already paused', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(pauseDownload('dl-001')).rejects.toEqual(errorBody);
    });
  });

  describe('resumeDownload', () => {
    it('sends POST to resume endpoint and returns void for 204', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await resumeDownload('dl-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/downloads/dl-001/resume`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'conflict', message: 'Not paused', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(resumeDownload('dl-001')).rejects.toEqual(errorBody);
    });
  });

  describe('getDownloadHistory', () => {
    it('sends GET with familyId, page, and limit query params', async () => {
      const history = { downloads: [mockDownload], total: 1 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(history),
      });

      const result = await getDownloadHistory('fam-001', 2, 50);

      expect(result).toEqual(history);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/acquisition/downloads/history?');
      expect(calledUrl).toContain('familyId=fam-001');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=50');
    });

    it('uses default page=1 and limit=20', async () => {
      const history = { downloads: [], total: 0 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(history),
      });

      await getDownloadHistory('fam-001');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=20');
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ downloads: [], total: 0 }),
      });

      await getDownloadHistory('fam-001', 1, 20, 'http://custom:9999');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('http://custom:9999/api/v1/acquisition/downloads/history?');
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'DB error', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getDownloadHistory('fam-001')).rejects.toEqual(errorBody);
    });
  });

  // -- Rules --

  describe('listRules', () => {
    it('sends GET with familyId and returns DownloadRule[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockRule]),
      });

      const result = await listRules('fam-001');

      expect(result).toEqual([mockRule]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules?familyId=fam-001`,
        expect.any(Object),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listRules('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Timeout', statusCode: 504 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        statusText: 'Gateway Timeout',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listRules('fam-001')).rejects.toEqual(errorBody);
    });
  });

  describe('createRule', () => {
    const params: CreateRuleRequest = {
      name: 'Auto-download 4K',
      priority: 1,
      conditions: { quality: '4k_premium', minSeeders: 10 },
      action: 'auto_download',
    };

    it('sends POST with familyId and params merged in body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRule),
      });

      const result = await createRule('fam-001', params);

      expect(result).toEqual(mockRule);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', ...params }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRule),
      });

      await createRule('fam-001', params, 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/rules',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'bad_request', message: 'Invalid conditions', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(createRule('fam-001', params)).rejects.toEqual(errorBody);
    });
  });

  describe('updateRule', () => {
    it('sends PATCH with partial params and returns updated DownloadRule', async () => {
      const updated = { ...mockRule, priority: 5 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const result = await updateRule('rule-001', { priority: 5 });

      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules/rule-001`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ priority: 5 }),
        }),
      );
    });

    it('throws PluginError on 404', async () => {
      const errorBody = { error: 'not_found', message: 'Rule not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(updateRule('nonexistent', { priority: 1 })).rejects.toEqual(errorBody);
    });
  });

  describe('deleteRule', () => {
    it('sends DELETE and returns void for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await deleteRule('rule-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules/rule-001`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Rule not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(deleteRule('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  describe('testRule', () => {
    it('sends POST with sample content and returns match result', async () => {
      const matchResult = { matches: true, action: 'auto_download' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(matchResult),
      });

      const sampleContent = { quality: '4k_premium', seeders: 50 };
      const result = await testRule('rule-001', sampleContent);

      expect(result).toEqual(matchResult);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/acquisition/rules/rule-001/test`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(sampleContent),
        }),
      );
    });

    it('returns non-matching result', async () => {
      const noMatch = { matches: false, action: 'skip' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(noMatch),
      });

      const result = await testRule('rule-001', { quality: 'hdtv' });

      expect(result.matches).toBe(false);
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ matches: true, action: 'notify' }),
      });

      await testRule('rule-001', { quality: '4k_premium' }, 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/acquisition/rules/rule-001/test',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'not_found', message: 'Rule not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(testRule('nonexistent', {})).rejects.toEqual(errorBody);
    });
  });

  // -- History --

  describe('getRecentActivity', () => {
    it('sends GET with familyId and limit query params', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockActivity]),
      });

      const result = await getRecentActivity('fam-001', 10);

      expect(result).toEqual([mockActivity]);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/acquisition/activity?');
      expect(calledUrl).toContain('familyId=fam-001');
      expect(calledUrl).toContain('limit=10');
    });

    it('uses default limit=20', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getRecentActivity('fam-001');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=20');
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getRecentActivity('fam-001', 20, 'http://custom:9999');

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('http://custom:9999/api/v1/acquisition/activity?');
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'DB error', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getRecentActivity('fam-001')).rejects.toEqual(errorBody);
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

      await expect(getRecentActivity('fam-001')).rejects.toThrow('fetch failed');
    });
  });
});
