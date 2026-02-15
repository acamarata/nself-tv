const { createStorage, createStorageFromEnv, LocalStorage } = require('../storage');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Storage', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
  });

  describe('LocalStorage', () => {
    let storage;

    beforeEach(async () => {
      storage = new LocalStorage(tmpDir);
      await storage.init();
    });

    it('should create storage instance', () => {
      expect(storage).toBeDefined();
      expect(storage.basePath).toBe(tmpDir);
    });

    it('should require basePath', () => {
      expect(() => new LocalStorage()).toThrow('basePath is required');
    });

    it('should put and get file', async () => {
      const key = 'test/file.txt';
      const content = Buffer.from('Hello, World!');

      await storage.put(key, content, content.length, 'text/plain');

      const stream = await storage.get(key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const result = Buffer.concat(chunks);

      expect(result.toString()).toBe('Hello, World!');
    });

    it('should check if file exists', async () => {
      const key = 'test/exists.txt';
      const content = Buffer.from('test');

      let exists = await storage.exists(key);
      expect(exists).toBe(false);

      await storage.put(key, content, content.length, 'text/plain');

      exists = await storage.exists(key);
      expect(exists).toBe(true);
    });

    it('should delete file', async () => {
      const key = 'test/delete.txt';
      const content = Buffer.from('to be deleted');

      await storage.put(key, content, content.length, 'text/plain');
      expect(await storage.exists(key)).toBe(true);

      await storage.delete(key);
      expect(await storage.exists(key)).toBe(false);
    });

    it('should list files', async () => {
      await storage.put('test/list/file1.txt', Buffer.from('test'), 4, 'text/plain');
      await storage.put('test/list/file2.txt', Buffer.from('test'), 4, 'text/plain');
      await storage.put('test/list/sub/file3.txt', Buffer.from('test'), 4, 'text/plain');

      const keys = await storage.list('test/list');
      expect(keys).toHaveLength(3);
      expect(keys).toContain('test/list/file1.txt');
      expect(keys).toContain('test/list/file2.txt');
      expect(keys).toContain('test/list/sub/file3.txt');
    });

    it('should generate file URL', async () => {
      const key = 'test/url.txt';
      const content = Buffer.from('test');

      await storage.put(key, content, content.length, 'text/plain');

      const url = await storage.url(key, 3600);
      expect(url).toMatch(/^file:\/\//);
      expect(url).toContain('url.txt');
    });

    it('should throw error for URL of non-existent file', async () => {
      await expect(storage.url('nonexistent.txt', 3600)).rejects.toThrow('File not found');
    });

    it('should stream file with range', async () => {
      const key = 'test/stream.txt';
      const content = Buffer.from('0123456789');

      await storage.put(key, content, content.length, 'text/plain');

      // Stream bytes 5-9
      const stream = await storage.stream(key, 5, 5);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const result = Buffer.concat(chunks);

      expect(result.toString()).toBe('56789');
    });

    it('should stream file from offset to end', async () => {
      const key = 'test/stream2.txt';
      const content = Buffer.from('0123456789');

      await storage.put(key, content, content.length, 'text/plain');

      // Stream from offset 5 to end
      const stream = await storage.stream(key, 5, 0);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const result = Buffer.concat(chunks);

      expect(result.toString()).toBe('56789');
    });

    it('should handle nested directories', async () => {
      const key = 'a/b/c/d/e/file.txt';
      const content = Buffer.from('nested');

      await storage.put(key, content, content.length, 'text/plain');

      const exists = await storage.exists(key);
      expect(exists).toBe(true);
    });

    it('should handle empty content', async () => {
      const key = 'empty.txt';
      const content = Buffer.from('');

      await storage.put(key, content, 0, 'text/plain');

      const stream = await storage.get(key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const result = Buffer.concat(chunks);

      expect(result.length).toBe(0);
    });

    it('should not error when deleting non-existent file', async () => {
      await expect(storage.delete('nonexistent.txt')).resolves.not.toThrow();
    });

    it('should return empty array for non-existent prefix', async () => {
      const keys = await storage.list('nonexistent/prefix');
      expect(keys).toEqual([]);
    });
  });

  describe('createStorage', () => {
    it('should create local storage', async () => {
      const storage = await createStorage({
        backend: 'local',
        localPath: tmpDir,
      });

      expect(storage).toBeInstanceOf(LocalStorage);
    });

    it('should default to local storage', async () => {
      const storage = await createStorage({
        localPath: tmpDir,
      });

      expect(storage).toBeInstanceOf(LocalStorage);
    });

    it('should throw for unknown backend', async () => {
      await expect(
        createStorage({
          backend: 'unknown',
          localPath: tmpDir,
        })
      ).rejects.toThrow('Unknown storage backend');
    });
  });

  describe('createStorageFromEnv', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create storage from environment variables', async () => {
      process.env.STORAGE_BACKEND = 'local';
      process.env.STORAGE_LOCAL_PATH = tmpDir;

      const storage = await createStorageFromEnv();

      expect(storage).toBeInstanceOf(LocalStorage);
      expect(storage.basePath).toBe(tmpDir);
    });

    it('should default to local backend', async () => {
      delete process.env.STORAGE_BACKEND;
      process.env.STORAGE_LOCAL_PATH = tmpDir;

      const storage = await createStorageFromEnv();

      expect(storage).toBeInstanceOf(LocalStorage);
    });

    it('should default to /var/lib/nself-tv/media for local path', async () => {
      delete process.env.STORAGE_LOCAL_PATH;

      const storage = await createStorageFromEnv();

      expect(storage).toBeInstanceOf(LocalStorage);
      expect(storage.basePath).toBe('/var/lib/nself-tv/media');
    });
  });
});
