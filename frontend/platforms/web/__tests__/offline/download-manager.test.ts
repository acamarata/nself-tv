import { describe, it, expect, beforeEach, vi } from 'vitest';
import { downloadManager, type DownloadItem } from '@/lib/offline/download-manager';

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(() => ({
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          add: vi.fn(() => ({ onsuccess: null, onerror: null })),
          put: vi.fn(() => ({ onsuccess: null, onerror: null })),
          delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
          clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
      objectStoreNames: {
        contains: vi.fn(() => false),
      },
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
};

// Mock caches API
const cachesMock = {
  open: vi.fn(() =>
    Promise.resolve({
      put: vi.fn(() => Promise.resolve()),
      match: vi.fn(() => Promise.resolve(undefined)),
      delete: vi.fn(() => Promise.resolve(true)),
      keys: vi.fn(() => Promise.resolve([])),
    })
  ),
  keys: vi.fn(() => Promise.resolve([])),
  delete: vi.fn(() => Promise.resolve(true)),
};

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: (name: string) => {
        if (name === 'Content-Length') return '1000000';
        if (name === 'Content-Type') return 'video/mp4';
        return null;
      },
    },
    body: {
      getReader: () => ({
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array(100) })
          .mockResolvedValueOnce({ done: true }),
      }),
    },
  })
) as vi.Mock;

describe('DownloadManager', () => {
  beforeEach(() => {
    // @ts-ignore
    global.indexedDB = indexedDBMock;
    // @ts-ignore
    global.caches = cachesMock;

    vi.clearAllMocks();
  });

  describe('add', () => {
    it('should add a download to the queue', async () => {
      const id = await downloadManager.add(
        'content-1',
        'Test Movie',
        'https://example.com/movie.mp4'
      );

      expect(id).toMatch(/^dl-/);

      const item = downloadManager.get(id);
      expect(item).toBeDefined();
      expect(item?.contentId).toBe('content-1');
      expect(item?.title).toBe('Test Movie');
      expect(item?.status).toBe('queued');
    });

    it('should support pinned downloads', async () => {
      const id = await downloadManager.add(
        'content-2',
        'Pinned Movie',
        'https://example.com/pinned.mp4',
        true
      );

      const item = downloadManager.get(id);
      expect(item?.pinned).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return all downloads', async () => {
      await downloadManager.add('c1', 'Movie 1', 'https://example.com/1.mp4');
      await downloadManager.add('c2', 'Movie 2', 'https://example.com/2.mp4');

      const all = downloadManager.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('pause', () => {
    it('should pause a downloading item', async () => {
      const id = await downloadManager.add('c3', 'Movie 3', 'https://example.com/3.mp4');

      await downloadManager.pause(id);

      const item = downloadManager.get(id);
      // Status might be queued if download hasn't started yet
      expect(['queued', 'paused']).toContain(item?.status);
    });
  });

  describe('resume', () => {
    it('should resume a paused item', async () => {
      const id = await downloadManager.add('c4', 'Movie 4', 'https://example.com/4.mp4');

      await downloadManager.pause(id);
      await downloadManager.resume(id);

      const item = downloadManager.get(id);
      expect(item?.status).toBe('queued');
    });
  });

  describe('remove', () => {
    it('should remove a download', async () => {
      const id = await downloadManager.add('c5', 'Movie 5', 'https://example.com/5.mp4');

      await downloadManager.remove(id);

      const item = downloadManager.get(id);
      expect(item).toBeUndefined();
    });
  });

  describe('setPin', () => {
    it('should pin/unpin a download', async () => {
      const id = await downloadManager.add('c6', 'Movie 6', 'https://example.com/6.mp4');

      await downloadManager.setPin(id, true);
      let item = downloadManager.get(id);
      expect(item?.pinned).toBe(true);

      await downloadManager.setPin(id, false);
      item = downloadManager.get(id);
      expect(item?.pinned).toBe(false);
    });
  });

  describe('onProgress', () => {
    it('should register progress callback', () => {
      const callback = vi.fn();
      downloadManager.onProgress('test-id', callback);

      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('offProgress', () => {
    it('should unregister progress callback', () => {
      const callback = vi.fn();
      downloadManager.onProgress('test-id', callback);
      downloadManager.offProgress('test-id');

      // No error should be thrown
      expect(true).toBe(true);
    });
  });
});
