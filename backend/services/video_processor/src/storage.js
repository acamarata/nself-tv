/**
 * MinIO / S3-compatible object storage client wrapper.
 *
 * Provides high-level helpers for uploading, downloading, generating presigned
 * URLs, and ensuring buckets exist. All operations use the official `minio`
 * npm package.
 */

const Minio = require('minio');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/** Singleton MinIO client instance */
let client = null;

/**
 * Get or create the MinIO client singleton.
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
  }
  return client;
}

/**
 * Ensure a bucket exists, creating it if necessary.
 *
 * @param {string} bucket - Bucket name
 * @returns {Promise<void>}
 */
async function ensureBucket(bucket) {
  const mc = getClient();
  const exists = await mc.bucketExists(bucket);
  if (!exists) {
    await mc.makeBucket(bucket);
  }
}

/**
 * Upload a local file to MinIO.
 *
 * @param {string} bucket   - Target bucket name
 * @param {string} key      - Object key (path within bucket)
 * @param {string} filePath - Absolute path to the local file
 * @param {Object} [metadata] - Optional metadata headers
 * @returns {Promise<Object>} Upload result with etag and versionId
 */
async function uploadFile(bucket, key, filePath, metadata = {}) {
  const mc = getClient();
  await ensureBucket(bucket);

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  const contentType = resolveContentType(filePath);
  const metaData = { 'Content-Type': contentType, ...metadata };

  return mc.putObject(bucket, key, fileStream, stat.size, metaData);
}

/**
 * Download a file from MinIO to a local path.
 *
 * @param {string} bucket   - Source bucket name
 * @param {string} key      - Object key
 * @param {string} destPath - Absolute path to write the file
 * @returns {Promise<void>}
 */
async function downloadFile(bucket, key, destPath) {
  const mc = getClient();

  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });

  await mc.fGetObject(bucket, key, destPath);
}

/**
 * Generate a presigned GET URL for an object.
 *
 * @param {string} bucket        - Bucket name
 * @param {string} key           - Object key
 * @param {number} [expirySeconds=3600] - URL lifetime in seconds (default 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
async function generatePresignedUrl(bucket, key, expirySeconds = 3600) {
  const mc = getClient();
  return mc.presignedGetObject(bucket, key, expirySeconds);
}

/**
 * Resolve a basic content type from a file extension.
 *
 * @param {string} filePath
 * @returns {string}
 */
function resolveContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/MP2T',
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.vtt': 'text/vtt',
    '.srt': 'application/x-subrip',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.json': 'application/json',
  };
  return types[ext] || 'application/octet-stream';
}

module.exports = {
  getClient,
  ensureBucket,
  uploadFile,
  downloadFile,
  generatePresignedUrl,
};
