import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrickplayLoader } from '@/lib/trickplay/loader';
import type { TrickplayConfig, TrickplayCue } from '@/lib/trickplay/loader';

const sampleVTT = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite_0.jpg#xywh=0,0,320,180

00:00:05.000 --> 00:00:10.000
sprite_0.jpg#xywh=320,0,320,180

00:00:10.000 --> 00:00:15.000
sprite_1.jpg#xywh=0,0,320,180
`;

const sampleVTTWithMMSS = `WEBVTT

00:00.000 --> 00:05.000
sprite_0.jpg#xywh=0,0,320,180

00:05.000 --> 00:10.000
sprite_0.jpg#xywh=320,0,320,180
`;

const defaultConfig: TrickplayConfig = {
  vttUrl: 'https://example.com/trickplay.vtt',
  spriteBaseUrl: 'https://example.com/sprites',
  tileWidth: 320,
  tileHeight: 180,
  gridColumns: 5,
  gridRows: 5,
};

describe('TrickplayLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('load', () => {
    it('fetches VTT and parses cues', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/trickplay.vtt');
      expect(loader.isLoaded()).toBe(true);

      const cues = loader.getCues();
      expect(cues).toHaveLength(3);

      expect(cues[0]).toEqual({
        startTime: 0,
        endTime: 5,
        spriteUrl: 'https://example.com/sprites/sprite_0.jpg',
        x: 0,
        y: 0,
      });

      expect(cues[1]).toEqual({
        startTime: 5,
        endTime: 10,
        spriteUrl: 'https://example.com/sprites/sprite_0.jpg',
        x: 320,
        y: 0,
      });

      expect(cues[2]).toEqual({
        startTime: 10,
        endTime: 15,
        spriteUrl: 'https://example.com/sprites/sprite_1.jpg',
        x: 0,
        y: 0,
      });
    });

    it('returns same result when called twice (idempotent)', async () => {
      let fetchCount = 0;
      vi.spyOn(global, 'fetch').mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(sampleVTT),
        } as Response);
      });

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();
      await loader.load();

      expect(fetchCount).toBe(1);
      expect(loader.getCues()).toHaveLength(3);
    });

    it('returns same promise when called concurrently', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      const promise1 = loader.load();
      const promise2 = loader.load();

      await Promise.all([promise1, promise2]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws on fetch failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await expect(loader.load()).rejects.toThrow(
        'Failed to load trickplay VTT: 404 Not Found'
      );
    });

    it('throws on network error', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const loader = new TrickplayLoader(defaultConfig);
      await expect(loader.load()).rejects.toThrow('Network error');
    });
  });

  describe('getCueAtTime', () => {
    it('returns correct cue for time within range', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cue = loader.getCueAtTime(3);
      expect(cue).not.toBeNull();
      expect(cue!.startTime).toBe(0);
      expect(cue!.endTime).toBe(5);
    });

    it('returns correct cue at exact start time', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cue = loader.getCueAtTime(5);
      expect(cue).not.toBeNull();
      expect(cue!.startTime).toBe(5);
      expect(cue!.endTime).toBe(10);
    });

    it('returns null for time at exact end of last cue', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cue = loader.getCueAtTime(15);
      expect(cue).toBeNull();
    });

    it('returns null for time before any cue', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cue = loader.getCueAtTime(-1);
      expect(cue).toBeNull();
    });

    it('returns null for time after all cues', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cue = loader.getCueAtTime(100);
      expect(cue).toBeNull();
    });

    it('returns null when no cues loaded', () => {
      const loader = new TrickplayLoader(defaultConfig);
      const cue = loader.getCueAtTime(5);
      expect(cue).toBeNull();
    });
  });

  describe('isLoaded', () => {
    it('returns false before load', () => {
      const loader = new TrickplayLoader(defaultConfig);
      expect(loader.isLoaded()).toBe(false);
    });

    it('returns true after successful load', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();
      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe('getCues', () => {
    it('returns empty array before load', () => {
      const loader = new TrickplayLoader(defaultConfig);
      expect(loader.getCues()).toEqual([]);
    });

    it('returns all parsed cues after load', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();
      expect(loader.getCues()).toHaveLength(3);
    });
  });

  describe('sprite base URL handling', () => {
    it('handles spriteBaseUrl with trailing slash', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const configWithSlash: TrickplayConfig = {
        ...defaultConfig,
        spriteBaseUrl: 'https://example.com/sprites/',
      };

      const loader = new TrickplayLoader(configWithSlash);
      await loader.load();

      const cues = loader.getCues();
      expect(cues[0].spriteUrl).toBe('https://example.com/sprites/sprite_0.jpg');
    });

    it('handles spriteBaseUrl without trailing slash', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const configNoSlash: TrickplayConfig = {
        ...defaultConfig,
        spriteBaseUrl: 'https://example.com/sprites',
      };

      const loader = new TrickplayLoader(configNoSlash);
      await loader.load();

      const cues = loader.getCues();
      expect(cues[0].spriteUrl).toBe('https://example.com/sprites/sprite_0.jpg');
    });
  });

  describe('timestamp parsing', () => {
    it('parses HH:MM:SS.mmm timestamps', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cues = loader.getCues();
      expect(cues[0].startTime).toBe(0);
      expect(cues[0].endTime).toBe(5);
    });

    it('parses MM:SS.mmm timestamps', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleVTTWithMMSS),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cues = loader.getCues();
      expect(cues).toHaveLength(2);
      expect(cues[0].startTime).toBe(0);
      expect(cues[0].endTime).toBe(5);
      expect(cues[1].startTime).toBe(5);
      expect(cues[1].endTime).toBe(10);
    });

    it('handles timestamps with hours', async () => {
      const vttWithHours = `WEBVTT

01:30:00.000 --> 01:30:05.000
sprite_0.jpg#xywh=0,0,320,180
`;

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(vttWithHours),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cues = loader.getCues();
      expect(cues[0].startTime).toBe(5400);
      expect(cues[0].endTime).toBe(5405);
    });
  });

  describe('edge cases', () => {
    it('handles empty VTT file', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('WEBVTT\n'),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      expect(loader.getCues()).toHaveLength(0);
      expect(loader.isLoaded()).toBe(true);
    });

    it('handles VTT with Windows-style line endings', async () => {
      const windowsVTT = 'WEBVTT\r\n\r\n00:00:00.000 --> 00:00:05.000\r\nsprite_0.jpg#xywh=0,0,320,180\r\n';

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(windowsVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cues = loader.getCues();
      expect(cues).toHaveLength(1);
      expect(cues[0].x).toBe(0);
      expect(cues[0].y).toBe(0);
    });

    it('skips lines without xywh fragment', async () => {
      const badVTT = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite_0.jpg

00:00:05.000 --> 00:00:10.000
sprite_0.jpg#xywh=320,0,320,180
`;

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(badVTT),
      } as Response);

      const loader = new TrickplayLoader(defaultConfig);
      await loader.load();

      const cues = loader.getCues();
      expect(cues).toHaveLength(1);
      expect(cues[0].startTime).toBe(5);
    });
  });
});
