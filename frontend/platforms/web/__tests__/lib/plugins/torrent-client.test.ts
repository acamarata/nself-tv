import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listSources,
  getSeedingStats,
  getSeedingAggregate,
  updateSeedingPolicy,
  getBandwidthConfig,
  setBandwidthConfig,
} from '@/lib/plugins/torrent-client';
import type {
  TorrentSource,
  SeedingStats,
  SeedingAggregate,
  BandwidthConfig,
} from '@/types/acquisition';

const BASE = 'http://localhost:3201';

const mockSource: TorrentSource = {
  id: 'src-001',
  name: '1337x',
  domain: '1337x.to',
  activeFrom: '2020-01-01T00:00:00Z',
  retiredAt: null,
  isActive: true,
  trustScore: 0.92,
};

const mockSeedingStats: SeedingStats = {
  id: 'seed-001',
  torrentHash: 'abc123def456',
  name: 'Breaking.Bad.S01E01.720p.WEB-DL',
  ratio: 2.5,
  uploaded: 2684354560,
  downloaded: 1073741824,
  seedingDuration: 86400,
  isFavorite: true,
  seedRatioLimit: 3.0,
  seedTimeLimitMinutes: 10080,
};

const mockAggregate: SeedingAggregate = {
  totalUploaded: 53687091200,
  totalDownloaded: 21474836480,
  averageRatio: 2.5,
  activeTorrents: 12,
  completedTorrents: 85,
};

const mockBandwidth: BandwidthConfig = {
  downloadLimitKbps: 51200,
  uploadLimitKbps: 10240,
  scheduleEnabled: true,
  schedule: [
    {
      dayOfWeek: 1,
      startHour: 9,
      endHour: 17,
      downloadLimitKbps: 25600,
      uploadLimitKbps: 5120,
    },
  ],
};

describe('torrent-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -- listSources --

  describe('listSources', () => {
    it('sends GET and returns TorrentSource[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSource]),
      });

      const result = await listSources();

      expect(result).toEqual([mockSource]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/sources`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('returns empty array when no sources configured', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const result = await listSources();

      expect(result).toEqual([]);
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSource]),
      });

      await listSources('http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/sources',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'service_unavailable', message: 'Torrent daemon offline', statusCode: 503 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve(errorBody),
      });

      await expect(listSources()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(listSources()).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(listSources()).rejects.toThrow('Network failure');
    });
  });

  // -- getSeedingStats --

  describe('getSeedingStats', () => {
    it('sends GET and returns SeedingStats[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockSeedingStats]),
      });

      const result = await getSeedingStats();

      expect(result).toEqual([mockSeedingStats]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/seeding`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('returns empty array when nothing is seeding', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const result = await getSeedingStats();

      expect(result).toEqual([]);
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getSeedingStats('http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/seeding',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Query failed', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getSeedingStats()).rejects.toEqual(errorBody);
    });
  });

  // -- getSeedingAggregate --

  describe('getSeedingAggregate', () => {
    it('sends GET and returns SeedingAggregate', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAggregate),
      });

      const result = await getSeedingAggregate();

      expect(result).toEqual(mockAggregate);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/seeding/aggregate`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAggregate),
      });

      await getSeedingAggregate('http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/seeding/aggregate',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Aggregation failed', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getSeedingAggregate()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getSeedingAggregate()).rejects.toEqual({
        error: 'unknown',
        message: 'Bad Gateway',
        statusCode: 502,
      });
    });
  });

  // -- updateSeedingPolicy --

  describe('updateSeedingPolicy', () => {
    it('sends PATCH with policy body and returns updated SeedingStats', async () => {
      const updated = { ...mockSeedingStats, seedRatioLimit: 5.0 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const policy = { seedRatioLimit: 5.0 };
      const result = await updateSeedingPolicy('abc123def456', policy);

      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/seeding/abc123def456`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(policy),
        }),
      );
    });

    it('updates multiple policy fields at once', async () => {
      const updated = { ...mockSeedingStats, seedRatioLimit: 2.0, seedTimeLimitMinutes: 1440, isFavorite: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const policy = { seedRatioLimit: 2.0, seedTimeLimitMinutes: 1440, isFavorite: false };
      const result = await updateSeedingPolicy('abc123def456', policy);

      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/seeding/abc123def456`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(policy),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSeedingStats),
      });

      await updateSeedingPolicy('abc123def456', { isFavorite: true }, 'http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/seeding/abc123def456',
        expect.any(Object),
      );
    });

    it('throws PluginError on 404', async () => {
      const errorBody = { error: 'not_found', message: 'Torrent not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(updateSeedingPolicy('nonexistent', { seedRatioLimit: 1.0 })).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(updateSeedingPolicy('abc', { seedRatioLimit: 1.0 })).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  // -- getBandwidthConfig --

  describe('getBandwidthConfig', () => {
    it('sends GET and returns BandwidthConfig', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBandwidth),
      });

      const result = await getBandwidthConfig();

      expect(result).toEqual(mockBandwidth);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/bandwidth`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('returns config with schedule entries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBandwidth),
      });

      const result = await getBandwidthConfig();

      expect(result.scheduleEnabled).toBe(true);
      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0].dayOfWeek).toBe(1);
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBandwidth),
      });

      await getBandwidthConfig('http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/bandwidth',
        expect.any(Object),
      );
    });

    it('throws PluginError on failure', async () => {
      const errorBody = { error: 'server_error', message: 'Config unavailable', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getBandwidthConfig()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getBandwidthConfig()).rejects.toEqual({
        error: 'unknown',
        message: 'Service Unavailable',
        statusCode: 503,
      });
    });
  });

  // -- setBandwidthConfig --

  describe('setBandwidthConfig', () => {
    it('sends PUT with config body and returns updated BandwidthConfig', async () => {
      const updated = { ...mockBandwidth, downloadLimitKbps: 102400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const config = { downloadLimitKbps: 102400 };
      const result = await setBandwidthConfig(config);

      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/bandwidth`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(config),
        }),
      );
    });

    it('sends full config with schedule', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBandwidth),
      });

      const result = await setBandwidthConfig(mockBandwidth);

      expect(result).toEqual(mockBandwidth);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/torrent/bandwidth`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockBandwidth),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBandwidth),
      });

      await setBandwidthConfig({ uploadLimitKbps: 20480 }, 'http://custom:8888');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:8888/api/v1/torrent/bandwidth',
        expect.any(Object),
      );
    });

    it('throws PluginError on validation error', async () => {
      const errorBody = { error: 'bad_request', message: 'Limit cannot be negative', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(setBandwidthConfig({ downloadLimitKbps: -1 })).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(setBandwidthConfig({ downloadLimitKbps: 1024 })).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(setBandwidthConfig({ downloadLimitKbps: 1024 })).rejects.toThrow('ECONNREFUSED');
    });
  });
});
