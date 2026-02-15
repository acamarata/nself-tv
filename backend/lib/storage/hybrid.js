const LocalStorage = require('./local');
const S3Storage = require('./s3');
const { Readable } = require('stream');

/**
 * HybridStorage implements storage with local primary and S3 backup
 * Writes go to local first (fast), then async sync to S3 (durable)
 * Reads prefer local (fast), fallback to S3 if missing
 */
class HybridStorage {
  constructor(config) {
    this.local = new LocalStorage(config.localPath);
    this.s3 = new S3Storage(config.s3);
    this.workers = config.workers || 4;
    this.syncQueue = [];
    this.processing = false;
  }

  /**
   * Initialize storage
   */
  async init() {
    await this.local.init();
    await this.s3.init();
  }

  /**
   * Process sync queue
   */
  async _processSyncQueue() {
    if (this.processing || this.syncQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.syncQueue.length > 0) {
      const job = this.syncQueue.shift();
      try {
        const stream = await this.local.get(job.key);
        await this.s3.put(job.key, stream, job.size, job.contentType);
      } catch (err) {
        console.error(`HybridStorage: Failed to sync ${job.key} to S3:`, err);
      }
    }

    this.processing = false;
  }

  /**
   * Upload data to storage
   * @param {string} key - Storage key/path
   * @param {Buffer|Readable} data - Data to upload
   * @param {number} size - Data size in bytes
   * @param {string} contentType - MIME type
   */
  async put(key, data, size, contentType) {
    // Write to local first (fast, synchronous)
    await this.local.put(key, data, size, contentType);

    // Queue for async S3 sync
    this.syncQueue.push({ key, size, contentType });
    setImmediate(() => this._processSyncQueue());
  }

  /**
   * Retrieve data from storage
   * @param {string} key - Storage key/path
   * @returns {Promise<Readable>} Readable stream
   */
  async get(key) {
    try {
      // Try local first (fast)
      return await this.local.get(key);
    } catch (err) {
      // Fallback to S3
      const stream = await this.s3.get(key);

      // Download to local for future reads
      setImmediate(async () => {
        try {
          const downloadStream = await this.s3.get(key);
          await this.local.put(key, downloadStream, 0, 'application/octet-stream');
        } catch (err) {
          console.error(`HybridStorage: Failed to cache ${key} locally:`, err);
        }
      });

      return stream;
    }
  }

  /**
   * Delete data from storage
   * @param {string} key - Storage key/path
   */
  async delete(key) {
    // Delete from both backends
    await Promise.allSettled([this.local.delete(key), this.s3.delete(key)]);
  }

  /**
   * List keys matching prefix
   * @param {string} prefix - Key prefix
   * @returns {Promise<string[]>} Array of keys
   */
  async list(prefix) {
    // Get from both backends and merge
    const [localKeys, s3Keys] = await Promise.allSettled([
      this.local.list(prefix),
      this.s3.list(prefix),
    ]);

    const keySet = new Set();

    if (localKeys.status === 'fulfilled') {
      localKeys.value.forEach((k) => keySet.add(k));
    }
    if (s3Keys.status === 'fulfilled') {
      s3Keys.value.forEach((k) => keySet.add(k));
    }

    return Array.from(keySet);
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    // Check local first (fast)
    const localExists = await this.local.exists(key);
    if (localExists) {
      return true;
    }

    // Check S3
    return this.s3.exists(key);
  }

  /**
   * Generate URL for key
   * @param {string} key - Storage key/path
   * @param {number} expiry - Expiry time in seconds
   * @returns {Promise<string>} URL
   */
  async url(key, expiry) {
    // Prefer S3 URL (works remotely)
    const s3Exists = await this.s3.exists(key);
    if (s3Exists) {
      return this.s3.url(key, expiry);
    }

    // Fallback to local URL
    return this.local.url(key, expiry);
  }

  /**
   * Stream data with range support
   * @param {string} key - Storage key/path
   * @param {number} offset - Byte offset
   * @param {number} length - Number of bytes (0 = to end)
   * @returns {Promise<Readable>} Readable stream
   */
  async stream(key, offset, length) {
    try {
      // Try local first (fast)
      return await this.local.stream(key, offset, length);
    } catch (err) {
      // Fallback to S3
      return this.s3.stream(key, offset, length);
    }
  }

  /**
   * Close storage and flush pending syncs
   */
  async close() {
    // Wait for sync queue to drain
    while (this.syncQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

module.exports = HybridStorage;
