import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRecording,
  finalizeRecording,
  listRecordings,
  getRecording,
  deleteRecording,
  getRecordingSchedule,
} from '@/lib/plugins/recording-client';
import type {
  Recording,
  ScheduledRecording,
  CreateRecordingParams,
} from '@/lib/plugins/recording-client';

const BASE = 'http://localhost:3602';

const mockRecording: Recording = {
  id: 'rec-001',
  eventId: 'evt-001',
  familyId: 'fam-001',
  channelId: 'ch-001',
  title: 'Evening News Recording',
  description: 'Recorded from Channel One',
  status: 'completed',
  startTime: '2026-02-13T18:00:00Z',
  endTime: '2026-02-13T19:00:00Z',
  duration: 3600,
  fileSize: 1073741824,
  filePath: '/recordings/rec-001.ts',
  thumbnailUrl: 'http://example.com/thumb/rec-001.jpg',
  createdAt: '2026-02-13T17:55:00Z',
  updatedAt: '2026-02-13T19:05:00Z',
};

const mockScheduled: ScheduledRecording = {
  id: 'sched-001',
  eventId: 'evt-002',
  familyId: 'fam-001',
  channelId: 'ch-001',
  title: 'Morning Show',
  startTime: '2026-02-14T08:00:00Z',
  endTime: '2026-02-14T10:00:00Z',
  isRecurring: true,
};

describe('recording-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRecording', () => {
    it('sends POST with recording params and returns Recording', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRecording),
      });

      const params: CreateRecordingParams = {
        eventId: 'evt-001',
        familyId: 'fam-001',
        channelId: 'ch-001',
      };

      const result = await createRecording(params);

      expect(result).toEqual(mockRecording);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(params),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRecording),
      });

      const params: CreateRecordingParams = {
        eventId: 'evt-001',
        familyId: 'fam-001',
        channelId: 'ch-001',
      };

      await createRecording(params, 'http://custom:7777');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:7777/api/v1/recordings',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'conflict', message: 'Recording already exists', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(
        createRecording({ eventId: 'evt-001', familyId: 'fam-001', channelId: 'ch-001' }),
      ).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(
        createRecording({ eventId: 'evt-001', familyId: 'fam-001', channelId: 'ch-001' }),
      ).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  describe('finalizeRecording', () => {
    it('sends POST to finalize endpoint and returns void', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await finalizeRecording('rec-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings/rec-001/finalize`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('listRecordings', () => {
    it('sends GET with familyId query param and returns Recording[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockRecording]),
      });

      const result = await listRecordings('fam-001');

      expect(result).toEqual([mockRecording]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings?familyId=fam-001`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listRecordings('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });
  });

  describe('getRecording', () => {
    it('sends GET and returns a single Recording', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRecording),
      });

      const result = await getRecording('rec-001');

      expect(result).toEqual(mockRecording);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings/rec-001`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws on 404', async () => {
      const errorBody = { error: 'not_found', message: 'Recording not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getRecording('nonexistent')).rejects.toEqual(errorBody);
    });
  });

  describe('deleteRecording', () => {
    it('sends DELETE and returns void', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await deleteRecording('rec-001');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/recordings/rec-001`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('getRecordingSchedule', () => {
    it('sends GET with familyId, start, end query params', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockScheduled]),
      });

      const start = new Date('2026-02-14T00:00:00Z');
      const end = new Date('2026-02-15T00:00:00Z');
      const result = await getRecordingSchedule('fam-001', start, end);

      expect(result).toEqual([mockScheduled]);
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/recordings/schedule?');
      expect(calledUrl).toContain('familyId=fam-001');
      expect(calledUrl).toContain('start=2026-02-14T00%3A00%3A00.000Z');
      expect(calledUrl).toContain('end=2026-02-15T00%3A00%3A00.000Z');
    });

    it('returns empty array when no scheduled recordings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const start = new Date('2026-03-01T00:00:00Z');
      const end = new Date('2026-03-02T00:00:00Z');
      const result = await getRecordingSchedule('fam-001', start, end);

      expect(result).toEqual([]);
    });
  });
});
