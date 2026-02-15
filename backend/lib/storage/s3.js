const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Readable } = require('stream');

/**
 * S3Storage implements storage interface for S3-compatible object storage
 */
class S3Storage {
  constructor(config) {
    if (!config.bucket) {
      throw new Error('bucket is required for S3Storage');
    }

    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle !== false, // Default to true for MinIO
    });
  }

  /**
   * Initialize storage (no-op for S3)
   */
  async init() {
    // No initialization needed
  }

  /**
   * Upload data to storage
   * @param {string} key - Storage key/path
   * @param {Buffer|Readable} data - Data to upload
   * @param {number} size - Data size in bytes
   * @param {string} contentType - MIME type
   */
  async put(key, data, size, contentType) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  /**
   * Retrieve data from storage
   * @param {string} key - Storage key/path
   * @returns {Promise<Readable>} Readable stream
   */
  async get(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.Body;
  }

  /**
   * Delete data from storage
   * @param {string} key - Storage key/path
   */
  async delete(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * List keys matching prefix
   * @param {string} prefix - Key prefix
   * @returns {Promise<string[]>} Array of keys
   */
  async list(prefix) {
    const keys = [];
    let continuationToken;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          keys.push(obj.Key);
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Generate presigned URL for key
   * @param {string} key - Storage key/path
   * @param {number} expiry - Expiry time in seconds
   * @returns {Promise<string>} Presigned URL
   */
  async url(key, expiry) {
    const exists = await this.exists(key);
    if (!exists) {
      throw new Error(`Object not found: ${key}`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiry });
  }

  /**
   * Stream data with range support
   * @param {string} key - Storage key/path
   * @param {number} offset - Byte offset
   * @param {number} length - Number of bytes (0 = to end)
   * @returns {Promise<Readable>} Readable stream
   */
  async stream(key, offset, length) {
    let range;
    if (length > 0) {
      range = `bytes=${offset}-${offset + length - 1}`;
    } else {
      range = `bytes=${offset}-`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: range,
    });

    const response = await this.client.send(command);
    return response.Body;
  }
}

module.exports = S3Storage;
