/**
 * Storage Abstraction Layer
 *
 * Unified interface for local, S3, and hybrid storage backends.
 * Mirrors the Go storage package interface for consistency.
 */

const LocalStorage = require('./local');
const S3Storage = require('./s3');
const HybridStorage = require('./hybrid');

/**
 * Create a storage backend based on configuration
 * @param {Object} config - Storage configuration
 * @param {string} config.backend - Backend type: 'local', 's3', 'hybrid'
 * @param {string} [config.localPath] - Local filesystem path
 * @param {string} [config.s3Endpoint] - S3 endpoint URL
 * @param {string} [config.s3Region] - S3 region
 * @param {string} [config.s3AccessKey] - S3 access key
 * @param {string} [config.s3SecretKey] - S3 secret key
 * @param {string} [config.s3Bucket] - S3 bucket name
 * @param {boolean} [config.s3PathStyle] - Use path-style URLs (MinIO)
 * @param {number} [config.hybridWorkers] - Number of async sync workers
 * @returns {Promise<Storage>} Storage instance
 */
async function createStorage(config) {
  const backend = config.backend || 'local';

  switch (backend) {
    case 'local':
      return new LocalStorage(config.localPath);

    case 's3':
      return new S3Storage({
        endpoint: config.s3Endpoint,
        region: config.s3Region,
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
        bucket: config.s3Bucket,
        forcePathStyle: config.s3PathStyle,
      });

    case 'hybrid':
      return new HybridStorage({
        localPath: config.localPath,
        s3: {
          endpoint: config.s3Endpoint,
          region: config.s3Region,
          accessKeyId: config.s3AccessKey,
          secretAccessKey: config.s3SecretKey,
          bucket: config.s3Bucket,
          forcePathStyle: config.s3PathStyle,
        },
        workers: config.hybridWorkers || 4,
      });

    default:
      throw new Error(`Unknown storage backend: ${backend}`);
  }
}

/**
 * Create storage from environment variables
 * @returns {Promise<Storage>} Storage instance
 */
async function createStorageFromEnv() {
  return createStorage({
    backend: process.env.STORAGE_BACKEND || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || '/var/lib/nself-tv/media',
    s3Endpoint: process.env.STORAGE_S3_ENDPOINT,
    s3Region: process.env.STORAGE_S3_REGION || 'us-east-1',
    s3AccessKey: process.env.STORAGE_S3_ACCESS_KEY,
    s3SecretKey: process.env.STORAGE_S3_SECRET_KEY,
    s3Bucket: process.env.STORAGE_S3_BUCKET,
    s3PathStyle: process.env.STORAGE_S3_PATH_STYLE === 'true',
    hybridWorkers: parseInt(process.env.STORAGE_HYBRID_WORKERS || '4', 10),
  });
}

module.exports = {
  createStorage,
  createStorageFromEnv,
  LocalStorage,
  S3Storage,
  HybridStorage,
};
