/**
 * MinIO storage client wrapper for the thumbnail_generator service.
 * Provides download/upload helpers that work with buffers for in-memory image processing.
 */

const Minio = require('minio');
const config = require('./config');
const logger = require('./logger');

let client = null;

/**
 * Get or create the shared MinIO client instance.
 * @returns {Minio.Client}
 */
function getClient() {
  if (!client) {
    client = new Minio.Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
    logger.info('MinIO client initialized', {
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
    });
  }
  return client;
}

/**
 * Ensure a bucket exists, creating it if necessary.
 * @param {string} bucket
 */
async function ensureBucket(bucket) {
  const mc = getClient();
  const exists = await mc.bucketExists(bucket);
  if (!exists) {
    await mc.makeBucket(bucket);
    logger.info(`Created bucket: ${bucket}`);
  }
}

/**
 * Download an object from MinIO into a Buffer.
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<Buffer>}
 */
async function downloadBuffer(bucket, key) {
  const mc = getClient();
  const stream = await mc.getObject(bucket, key);
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Upload a Buffer to MinIO.
 * @param {string} bucket
 * @param {string} key
 * @param {Buffer} buffer
 * @param {object} [metadata]
 * @returns {Promise<string>} The object key that was written.
 */
async function uploadBuffer(bucket, key, buffer, metadata = {}) {
  const mc = getClient();
  await ensureBucket(bucket);
  const contentType = metadata.contentType || 'image/webp';
  await mc.putObject(bucket, key, buffer, buffer.length, {
    'Content-Type': contentType,
    ...metadata,
  });
  logger.debug(`Uploaded ${key} to ${bucket} (${buffer.length} bytes)`);
  return key;
}

/**
 * Get the stat (size, etag, etc.) of an object.
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<Minio.BucketItemStat>}
 */
async function statObject(bucket, key) {
  const mc = getClient();
  return mc.statObject(bucket, key);
}

/**
 * Build a presigned URL for GET access (default 1 hour expiry).
 * @param {string} bucket
 * @param {string} key
 * @param {number} [expiry=3600] Seconds
 * @returns {Promise<string>}
 */
async function presignedUrl(bucket, key, expiry = 3600) {
  const mc = getClient();
  return mc.presignedGetObject(bucket, key, expiry);
}

module.exports = {
  getClient,
  ensureBucket,
  downloadBuffer,
  uploadBuffer,
  statObject,
  presignedUrl,
};
