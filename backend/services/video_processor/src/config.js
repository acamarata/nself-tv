/**
 * Configuration module for the video_processor service.
 * All settings are derived from environment variables with sensible defaults.
 */

const config = {
  /** Redis connection configuration for BullMQ */
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  },

  /** BullMQ queue names */
  queues: {
    transcode: process.env.QUEUE_TRANSCODE || 'video-transcode',
    trickplay: process.env.QUEUE_TRICKPLAY || 'video-trickplay',
    subtitle: process.env.QUEUE_SUBTITLE || 'video-subtitle',
  },

  /** Worker concurrency per queue */
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },

  /** FFmpeg binary paths */
  ffmpeg: {
    ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || '/usr/bin/ffprobe',
  },

  /** MinIO / S3-compatible object storage */
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    buckets: {
      source: process.env.MINIO_BUCKET_SOURCE || 'media-source',
      output: process.env.MINIO_BUCKET_OUTPUT || 'media-output',
      thumbnails: process.env.MINIO_BUCKET_THUMBNAILS || 'media-thumbnails',
      subtitles: process.env.MINIO_BUCKET_SUBTITLES || 'media-subtitles',
    },
  },

  /** HTTP server configuration */
  server: {
    port: parseInt(process.env.PORT || '5005', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  /** Temp directory for processing */
  tempDir: process.env.TEMP_DIR || '/tmp/video_processor',

  /** Log level */
  logLevel: process.env.LOG_LEVEL || 'info',

  /** Node environment */
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
