const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Readable } = require('stream');

/**
 * LocalStorage implements storage interface for local filesystem
 */
class LocalStorage {
  constructor(basePath) {
    if (!basePath) {
      throw new Error('basePath is required for LocalStorage');
    }
    this.basePath = basePath;
  }

  /**
   * Initialize storage (create base directory)
   */
  async init() {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  /**
   * Upload data to storage
   * @param {string} key - Storage key/path
   * @param {Buffer|Readable} data - Data to upload
   * @param {number} size - Data size in bytes
   * @param {string} contentType - MIME type
   */
  async put(key, data, size, contentType) {
    const fullPath = path.join(this.basePath, key);

    // Create parent directories
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write data
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(fullPath, data);
    } else if (data instanceof Readable) {
      const writeStream = fsSync.createWriteStream(fullPath);
      await new Promise((resolve, reject) => {
        data.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } else {
      throw new Error('data must be Buffer or Readable stream');
    }
  }

  /**
   * Retrieve data from storage
   * @param {string} key - Storage key/path
   * @returns {Promise<Readable>} Readable stream
   */
  async get(key) {
    const fullPath = path.join(this.basePath, key);
    // Check if file exists
    await fs.access(fullPath);
    return fsSync.createReadStream(fullPath);
  }

  /**
   * Delete data from storage
   * @param {string} key - Storage key/path
   */
  async delete(key) {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // Ignore if file doesn't exist
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * List keys matching prefix
   * @param {string} prefix - Key prefix
   * @returns {Promise<string[]>} Array of keys
   */
  async list(prefix) {
    const searchPath = path.join(this.basePath, prefix);
    const keys = [];

    try {
      const walk = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            const relativePath = path.relative(this.basePath, fullPath);
            keys.push(relativePath.replace(/\\/g, '/'));
          }
        }
      };

      await walk(searchPath);
    } catch (err) {
      // Ignore if directory doesn't exist
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    return keys;
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate URL for key
   * @param {string} key - Storage key/path
   * @param {number} expiry - Expiry time in seconds
   * @returns {Promise<string>} URL
   */
  async url(key, expiry) {
    const fullPath = path.join(this.basePath, key);
    const exists = await this.exists(key);
    if (!exists) {
      throw new Error(`File not found: ${key}`);
    }
    return `file://${fullPath}`;
  }

  /**
   * Stream data with range support
   * @param {string} key - Storage key/path
   * @param {number} offset - Byte offset
   * @param {number} length - Number of bytes (0 = to end)
   * @returns {Promise<Readable>} Readable stream
   */
  async stream(key, offset, length) {
    const fullPath = path.join(this.basePath, key);
    await fs.access(fullPath);

    const options = { start: offset };
    if (length > 0) {
      options.end = offset + length - 1;
    }

    return fsSync.createReadStream(fullPath, options);
  }
}

module.exports = LocalStorage;
