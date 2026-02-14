/**
 * Poster generation worker.
 *
 * Queue: image:poster
 *
 * Receives a source image and produces resized poster variants in WebP format
 * with all EXIF/metadata stripped. Each variant is uploaded to MinIO.
 *
 * Job data schema:
 *   sourceUrl?     - ignored when sourceBucket + sourceKey are provided (future HTTP support)
 *   sourceBucket   - MinIO bucket that contains the source image
 *   sourceKey      - Object key inside sourceBucket
 *   outputBucket   - Target bucket for generated posters
 *   outputPrefix   - Key prefix for the output files (e.g. "posters/movie-123/")
 *   sizes?         - Array of target widths in pixels (default [100, 400, 1200])
 *
 * Returns:
 *   { posters: [{ size, width, height, url, format, sizeBytes }] }
 */

const { Worker } = require('bullmq');
const sharp = require('sharp');
const config = require('../config');
const storage = require('../storage');
const logger = require('../logger');

/**
 * Process a single poster generation job.
 * @param {import('bullmq').Job} job
 */
async function processPosterJob(job) {
  const {
    sourceBucket,
    sourceKey,
    outputBucket,
    outputPrefix,
    sizes = config.defaults.posterSizes,
  } = job.data;

  logger.info(`Poster job ${job.id} started`, { sourceBucket, sourceKey, sizes });

  if (!sourceBucket || !sourceKey) {
    throw new Error('sourceBucket and sourceKey are required');
  }
  if (!outputBucket || !outputPrefix) {
    throw new Error('outputBucket and outputPrefix are required');
  }

  // Download source image
  const sourceBuffer = await storage.downloadBuffer(sourceBucket, sourceKey);
  logger.debug(`Downloaded source image: ${sourceBuffer.length} bytes`);

  const posters = [];

  for (const targetWidth of sizes) {
    // Resize, convert to WebP, strip all metadata
    // Sharp strips all EXIF/metadata by default (withMetadata() would preserve it)
    const result = await sharp(sourceBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: config.defaults.webpQuality })
      .toBuffer({ resolveWithObject: true });

    const { data: outputBuffer, info } = result;

    const outputKey = `${outputPrefix}poster-${targetWidth}w.webp`;
    await storage.uploadBuffer(outputBucket, outputKey, outputBuffer, {
      contentType: 'image/webp',
    });

    const url = `${outputBucket}/${outputKey}`;

    posters.push({
      size: targetWidth,
      width: info.width,
      height: info.height,
      url,
      format: 'webp',
      sizeBytes: outputBuffer.length,
    });

    logger.debug(`Generated poster ${targetWidth}w: ${info.width}x${info.height}, ${outputBuffer.length} bytes`);

    // Report progress (percentage based on completed sizes)
    const pct = Math.round(((posters.length) / sizes.length) * 100);
    await job.updateProgress(pct);
  }

  logger.info(`Poster job ${job.id} completed: ${posters.length} variants`, {
    sizes: posters.map((p) => `${p.width}x${p.height}`),
  });

  return { posters };
}

/**
 * Create and return the BullMQ Worker for the poster queue.
 * @param {import('ioredis').Redis} connection
 * @returns {Worker}
 */
function createPosterWorker(connection) {
  const worker = new Worker(config.queues.poster, processPosterJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job) => {
    logger.info(`Poster job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Poster job ${job?.id} failed: ${err.message}`, { stack: err.stack });
  });

  worker.on('error', (err) => {
    logger.error(`Poster worker error: ${err.message}`, { stack: err.stack });
  });

  return worker;
}

module.exports = { createPosterWorker, processPosterJob };
