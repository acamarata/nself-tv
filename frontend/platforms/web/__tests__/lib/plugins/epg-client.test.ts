import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  importXMLTV,
  getChannels,
  getSchedule,
  searchPrograms,
  getNowPlaying,
} from '@/lib/plugins/epg-client';
import type { Channel, Program, ImportResult } from '@/lib/plugins/epg-client';

const BASE = 'http://localhost:3031';

const mockChannel: Channel = {
  id: 'ch-001',
  name: 'Channel One',
  number: 1,
  logoUrl: 'http://example.com/logo.png',
  groupId: 'grp-001',
  group: { id: 'grp-001', name: 'Entertainment', order: 1 },
  streamUrl: 'http://stream.example.com/ch1',
  isHd: true,
  isActive: true,
};

const mockProgram: Program = {
  id: 'prg-001',
  channelId: 'ch-001',
  title: 'Evening News',
  description: 'Daily news update',
  startTime: '2026-02-13T18:00:00Z',
  endTime: '2026-02-13T19:00:00Z',
  category: 'News',
  rating: 'TV-G',
  episodeNumber: null,
  seasonNumber: null,
  posterUrl: null,
  isNew: true,
  isLive: true,
};

describe('epg-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('importXMLTV', () => {
    it('sends POST with XMLTV data and returns import result', async () => {
      const importResult: ImportResult = { channels: 50, programs: 2400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(importResult),
      });

      const result = await importXMLTV('<tv>...</tv>');

      expect(result).toEqual(importResult);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/epg/import`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: '<tv>...</tv>' }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ channels: 0, programs: 0 }),
      });

      await importXMLTV('<tv/>', 'http://custom:4444');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:4444/api/v1/epg/import',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'bad_request', message: 'Invalid XMLTV', statusCode: 400 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve(errorBody),
      });

      await expect(importXMLTV('bad')).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(importXMLTV('data')).rejects.toEqual({
        error: 'unknown',
        message: 'Bad Gateway',
        statusCode: 502,
      });
    });
  });

  describe('getChannels', () => {
    it('sends GET and returns Channel[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockChannel]),
      });

      const result = await getChannels();

      expect(result).toEqual([mockChannel]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/epg/channels`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('getSchedule', () => {
    it('sends GET with channelId, start, end query params', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockProgram]),
      });

      const start = new Date('2026-02-13T00:00:00Z');
      const end = new Date('2026-02-14T00:00:00Z');
      const result = await getSchedule('ch-001', start, end);

      expect(result).toEqual([mockProgram]);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/epg/schedule?');
      expect(calledUrl).toContain('channelId=ch-001');
      expect(calledUrl).toContain('start=2026-02-13T00%3A00%3A00.000Z');
      expect(calledUrl).toContain('end=2026-02-14T00%3A00%3A00.000Z');
    });
  });

  describe('searchPrograms', () => {
    it('sends GET with query string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockProgram]),
      });

      const result = await searchPrograms('news');

      expect(result).toEqual([mockProgram]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/epg/programs/search?q=news`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes query with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await searchPrograms('news & weather');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/epg/programs/search?q=${encodeURIComponent('news & weather')}`,
        expect.any(Object),
      );
    });
  });

  describe('getNowPlaying', () => {
    it('sends GET and returns Program when something is playing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProgram),
      });

      const result = await getNowPlaying('ch-001');

      expect(result).toEqual(mockProgram);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/epg/channels/ch-001/now`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('returns null when nothing is playing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
      });

      const result = await getNowPlaying('ch-002');

      expect(result).toBeNull();
    });
  });
});
