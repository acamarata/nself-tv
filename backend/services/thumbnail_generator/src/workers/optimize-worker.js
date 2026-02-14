/**
 * Image optimization worker.
 *
 * Queue: image:optimize
 *
 * Takes a source image and produces an optimized version — typically by
 * converting to WebP, applying quality compression, and stripping all
 * EXIF / metadata.
 *
 * Job data schema:
 *   sourceUrl?     - ignored when sourceBucket + sourceKey are provided
 *   sourceBucket   - MinIO bucket containing the source image
 *   sourceKey      - Object key inside sourceBucket
 *   outputBucket   - Target bucket for the optimized image
 *   outputKey      - Target object key
 *   quality?       - WebP quality 1-100 (default 85)
 *   format?        - Output format: "webp" | "jpeg" | "png" | "avif" (default "webp")
 *
 * Returns:
 *   { url, originalSize, optimizedSize, savingsPercent, format }
 */

const { Worker } = require('bullmq');
const sharp = require('sharp');
const config = require('../config');
const storage = require('../storage');
const logger = require('../logger');

/** Map of supported output formats to their Sharp encoder + MIME type. */
const FORMAT_MAP = {
  webp: { encoder: 'webp', mime: 'image/webp', ext: 'webp' },
  jpeg: { encoder: 'jpeg', mime: 'image/jpeg', ext: 'jpg' },
  jpg: { encoder: 'jpeg', mime: 'image/jpeg', ext: 'jpg' },
  png: { encoder: 'png', mime: 'image/png', ext: 'png' },
  avif: { encoder: 'avif', mime: 'image/avif', ext: 'avif' },
};

/**
 * Process a single image optimization job.
 * @param {import('bullmq').Job} job
 */
async function processOptimizeJob(job) {
  const {
    sourceBucket,
    sourceKey,
    outputBucket,
    outputKey,
    quality = config.defaults.webpQuality,
    format = config.defaults.outputFormat,
  } = job.data;

  if (!sourceBucket || !sourceKey) {
    throw new Error('sourceBucket and sourceKey are required');
  }
  if (!outputBucket || !outputKey) {
    throw new Error('outputBucket and outputKey are required');
  }

  const fmt = FORMAT_MAP[format.toLowerCase()];
  if (!fmt) {
    throw new Error(`Unsupported format "${format}". Supported: ${Object.keys(FORMAT_MAP).join(', ')}`);
  }

  logger.info(`Optimize job ${job.id} started`, {
    sourceBucket,
    sourceKey,
    format,
    quality,
  });

  await job.updateProgress(10);

  // Download source
  const sourceBuffer = await storage.downloadBuffer(sourceBucket, sourceKey);
  const originalSize = sourceBuffer.length;

  await job.updateProgress(40);

  // Build the Sharp pipeline: convert format, set quality, strip metadata
  // Sharp strips all EXIF/metadata by default (withMetadata() would preserve it)
  let pipeline = sharp(sourceBuffer);

  switch (fmt.encoder) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
  }

  const optimizedBuffer = await pipeline.toBuffer();
  const optimizedSize = optimizedBuffer.length;

  await job.updateProgress(80);

  // Upload optimized image
  await storage.uploadBuffer(outputBucket, outputKey, optimizedBuffer, {
    contentType: fmt.mime,
  });

  const savingsPercent =
    originalSize > 0
      ? parseFloat((((originalSize - optimizedSize) / originalSize) * 100).toFixed(2))
      : 0;

  const url = `${outputBucket}/${outputKey}`;

  await job.updateProgress(100);

  logger.info(`Optimize job ${job.id} completed`, {
    originalSize,
    optimizedSize,
    savingsPercent: `${savingsPercent}%`,
    format: fmt.encoder,
  });

  return {
    url,
    originalSize,
    optimizedSize,
    savingsPercent,
    format: fmt.encoder,
  };
}

/**
 * Create and return the BullMQ Worker for the optimize queue.
 * @param {import('ioredis').Redis} connection
 * @returns {Worker}
 */
function createOptimizeWorker(connection) {
  const worker = new Worker(config.queues.optimize, processOptimizeJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job) => {
    logger.info(`Optimize job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Optimize job ${job?.id} failed: ${err.message}`, { stack: err.stack });
  });

  worker.on('error', (err) => {
    logger.error(`Optimize worker error: ${err.message}`, { stack: err.stack });
  });

  return worker;
}

module.exports = { createOptimizeWorker, processOptimizeJob };
