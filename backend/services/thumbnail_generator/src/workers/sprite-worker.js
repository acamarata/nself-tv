/**
 * Sprite sheet generation worker.
 *
 * Queue: image:sprite
 *
 * Assembles individual thumbnail images into sprite sheets used for video
 * timeline scrubbing. Each thumbnail is resized to a uniform size and
 * composited into a grid.
 *
 * Job data schema:
 *   images[]         - Array of { url?, bucket, key, timestamp }
 *   outputBucket     - Target bucket for sprite sheets
 *   outputPrefix     - Key prefix (e.g. "sprites/movie-123/")
 *   gridSize?        - [columns, rows] per sheet (default [10, 10])
 *   thumbWidth?      - Individual thumbnail width in px (default 320)
 *   thumbHeight?     - Individual thumbnail height in px (default 180)
 *
 * Returns:
 *   { sprites: [{ url, startIndex, endIndex, gridWidth, gridHeight, thumbWidth, thumbHeight }] }
 */

const { Worker } = require('bullmq');
const sharp = require('sharp');
const config = require('../config');
const storage = require('../storage');
const logger = require('../logger');

/**
 * Process a single sprite sheet generation job.
 * @param {import('bullmq').Job} job
 */
async function processSpriteJob(job) {
  const {
    images,
    outputBucket,
    outputPrefix,
    gridSize = config.defaults.spriteGridSize,
    thumbWidth = config.defaults.spriteThumbWidth,
    thumbHeight = config.defaults.spriteThumbHeight,
  } = job.data;

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('images array is required and must not be empty');
  }
  if (!outputBucket || !outputPrefix) {
    throw new Error('outputBucket and outputPrefix are required');
  }

  const [cols, rows] = gridSize;
  const perSheet = cols * rows;

  logger.info(`Sprite job ${job.id} started`, {
    imageCount: images.length,
    gridSize: `${cols}x${rows}`,
    thumbSize: `${thumbWidth}x${thumbHeight}`,
    sheetsNeeded: Math.ceil(images.length / perSheet),
  });

  // Download and resize all thumbnails first
  const resizedBuffers = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const rawBuffer = await storage.downloadBuffer(img.bucket, img.key);
    // Sharp strips all EXIF/metadata by default (withMetadata() would preserve it)
    const resized = await sharp(rawBuffer)
      .resize({ width: thumbWidth, height: thumbHeight, fit: 'cover' })
      .webp({ quality: config.defaults.webpQuality })
      .toBuffer();
    resizedBuffers.push(resized);

    // Report download/resize progress (first 50% of total)
    if (i % 10 === 0 || i === images.length - 1) {
      const pct = Math.round(((i + 1) / images.length) * 50);
      await job.updateProgress(pct);
    }
  }

  // Build sprite sheets
  const sprites = [];
  const totalSheets = Math.ceil(resizedBuffers.length / perSheet);

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    const startIndex = sheetIdx * perSheet;
    const endIndex = Math.min(startIndex + perSheet, resizedBuffers.length) - 1;
    const sheetThumbs = resizedBuffers.slice(startIndex, endIndex + 1);

    // Determine actual grid dimensions for this sheet (last sheet may be partial)
    const actualCount = sheetThumbs.length;
    const actualRows = Math.ceil(actualCount / cols);
    // Use full column count for width when there are multiple rows,
    // otherwise use the actual number of thumbnails
    const actualCols = actualRows > 1 ? cols : actualCount;

    const sheetWidth = actualCols * thumbWidth;
    const sheetHeight = actualRows * thumbHeight;

    // Build composite overlay list
    const composites = sheetThumbs.map((buf, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        input: buf,
        left: col * thumbWidth,
        top: row * thumbHeight,
      };
    });

    // Create the sprite sheet canvas and composite all thumbnails onto it
    const spriteBuffer = await sharp({
      create: {
        width: sheetWidth,
        height: sheetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite(composites)
      .webp({ quality: config.defaults.webpQuality })
      .toBuffer();

    const outputKey = `${outputPrefix}sprite-${sheetIdx}.webp`;
    await storage.uploadBuffer(outputBucket, outputKey, spriteBuffer, {
      contentType: 'image/webp',
    });

    const url = `${outputBucket}/${outputKey}`;

    sprites.push({
      url,
      startIndex,
      endIndex,
      gridWidth: actualCols,
      gridHeight: actualRows,
      thumbWidth,
      thumbHeight,
    });

    logger.debug(`Generated sprite sheet ${sheetIdx}: ${actualCols}x${actualRows} (${actualCount} thumbs), ${spriteBuffer.length} bytes`);

    // Report composition progress (second 50% of total)
    const pct = 50 + Math.round(((sheetIdx + 1) / totalSheets) * 50);
    await job.updateProgress(pct);
  }

  logger.info(`Sprite job ${job.id} completed: ${sprites.length} sheets for ${images.length} thumbnails`);

  return { sprites };
}

/**
 * Create and return the BullMQ Worker for the sprite queue.
 * @param {import('ioredis').Redis} connection
 * @returns {Worker}
 */
function createSpriteWorker(connection) {
  const worker = new Worker(config.queues.sprite, processSpriteJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job) => {
    logger.info(`Sprite job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Sprite job ${job?.id} failed: ${err.message}`, { stack: err.stack });
  });

  worker.on('error', (err) => {
    logger.error(`Sprite worker error: ${err.message}`, { stack: err.stack });
  });

  return worker;
}

module.exports = { createSpriteWorker, processSpriteJob };
