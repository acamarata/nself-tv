/**
 * Trickplay Worker
 *
 * BullMQ worker that consumes the `video:trickplay` queue. For each job it:
 *   1. Downloads the source file from MinIO
 *   2. Extracts thumbnails at a configurable interval (default 5 seconds)
 *   3. Resizes each thumbnail to 320x180
 *   4. Assembles thumbnails into 10x10 sprite sheets (3200x1800 each)
 *   5. Generates a WebVTT file with sprite coordinates for each timestamp
 *   6. Uploads sprites and VTT to MinIO
 */

const { Worker } = require('bullmq');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const storage = require('../storage');
const logger = require('../logger');

ffmpeg.setFfmpegPath(config.ffmpeg.ffmpegPath);
ffmpeg.setFfprobePath(config.ffmpeg.ffprobePath);

/** Sprite sheet grid dimensions */
const GRID_COLS = 10;
const GRID_ROWS = 10;
const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 180;

/**
 * Probe a file to extract duration.
 *
 * @param {string} filePath
 * @returns {Promise<number>} Duration in seconds
 */
function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(parseFloat(data.format.duration) || 0);
    });
  });
}

/**
 * Extract thumbnails from a video at a fixed interval.
 *
 * Uses FFmpeg's fps filter to extract one frame every `interval` seconds,
 * then scales each to THUMB_WIDTH x THUMB_HEIGHT.
 *
 * @param {string} sourcePath - Path to the source video
 * @param {string} thumbDir   - Output directory for individual thumbnails
 * @param {number} interval   - Seconds between thumbnails
 * @returns {Promise<number>} Number of thumbnails generated
 */
function extractThumbnails(sourcePath, thumbDir, interval) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(thumbDir, { recursive: true });

    const cmd = ffmpeg(sourcePath)
      .outputOptions([
        `-vf fps=1/${interval},scale=${THUMB_WIDTH}:${THUMB_HEIGHT}`,
        '-q:v 5',
        '-f image2',
      ])
      .output(path.join(thumbDir, 'thumb_%05d.jpg'));

    cmd.on('end', () => {
      const files = fs.readdirSync(thumbDir).filter((f) => f.endsWith('.jpg'));
      resolve(files.length);
    });

    cmd.on('error', (err) => reject(err));
    cmd.run();
  });
}

/**
 * Assemble individual thumbnails into sprite sheets using FFmpeg tile filter.
 *
 * Each sprite sheet is a GRID_COLS x GRID_ROWS tile of thumbnails.
 *
 * @param {string} thumbDir   - Directory containing individual thumb_XXXXX.jpg files
 * @param {string} spriteDir  - Output directory for sprite sheets
 * @param {number} thumbCount - Total number of thumbnails
 * @returns {Promise<string[]>} Array of sprite sheet filenames
 */
async function assembleSpriteSheets(thumbDir, spriteDir, thumbCount) {
  fs.mkdirSync(spriteDir, { recursive: true });

  const thumbsPerSheet = GRID_COLS * GRID_ROWS;
  const sheetCount = Math.ceil(thumbCount / thumbsPerSheet);
  const spriteFiles = [];

  for (let sheet = 0; sheet < sheetCount; sheet++) {
    const startIdx = sheet * thumbsPerSheet;
    const endIdx = Math.min(startIdx + thumbsPerSheet, thumbCount);
    const count = endIdx - startIdx;

    // Collect the thumb files for this sheet
    const inputs = [];
    for (let i = startIdx; i < endIdx; i++) {
      const thumbFile = `thumb_${String(i + 1).padStart(5, '0')}.jpg`;
      inputs.push(path.join(thumbDir, thumbFile));
    }

    // If we don't have a full grid, pad with the last image to fill the tile
    while (inputs.length < thumbsPerSheet) {
      inputs.push(inputs[inputs.length - 1]);
    }

    const spriteName = `sprite_${String(sheet).padStart(3, '0')}.jpg`;
    const spritePath = path.join(spriteDir, spriteName);

    // Create a file list for FFmpeg concat
    const listFile = path.join(spriteDir, `list_${sheet}.txt`);
    const listContent = inputs.map((f) => `file '${f}'`).join('\n');
    fs.writeFileSync(listFile, listContent, 'utf8');

    await new Promise((resolve, reject) => {
      const cmd = ffmpeg()
        .input(listFile)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          `-vf tile=${GRID_COLS}x${GRID_ROWS}`,
          '-frames:v 1',
          '-q:v 5',
        ])
        .output(spritePath);

      cmd.on('end', () => resolve());
      cmd.on('error', (err) => reject(err));
      cmd.run();
    });

    // Remove the temp list file
    fs.unlinkSync(listFile);

    spriteFiles.push(spriteName);
  }

  return spriteFiles;
}

/**
 * Generate a WebVTT file mapping each thumbnail timestamp to its sprite sheet
 * position.
 *
 * @param {number} thumbCount    - Total number of thumbnails
 * @param {number} interval      - Seconds between thumbnails
 * @param {string[]} spriteFiles - Sprite sheet filenames
 * @param {string} outputDir     - Directory to write the VTT file
 * @returns {string} VTT filename
 */
function generateVTT(thumbCount, interval, spriteFiles, outputDir) {
  const thumbsPerSheet = GRID_COLS * GRID_ROWS;
  const vttFile = 'trickplay.vtt';
  let content = 'WEBVTT\n\n';

  for (let i = 0; i < thumbCount; i++) {
    const startTime = i * interval;
    const endTime = (i + 1) * interval;
    const sheetIndex = Math.floor(i / thumbsPerSheet);
    const posInSheet = i % thumbsPerSheet;
    const col = posInSheet % GRID_COLS;
    const row = Math.floor(posInSheet / GRID_COLS);
    const x = col * THUMB_WIDTH;
    const y = row * THUMB_HEIGHT;

    content += `${formatVTTTime(startTime)} --> ${formatVTTTime(endTime)}\n`;
    content += `${spriteFiles[sheetIndex]}#xywh=${x},${y},${THUMB_WIDTH},${THUMB_HEIGHT}\n\n`;
  }

  fs.writeFileSync(path.join(outputDir, vttFile), content, 'utf8');
  return vttFile;
}

/**
 * Format seconds to WebVTT timestamp HH:MM:SS.mmm
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    '.' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Process a single trickplay job.
 *
 * @param {import('bullmq').Job} job
 * @returns {Promise<Object>}
 */
async function processTrickplayJob(job) {
  const {
    sourceBucket,
    sourceKey,
    outputBucket,
    outputPrefix,
    interval: rawInterval,
  } = job.data;

  const interval = rawInterval || 5;
  const jobDir = path.join(config.tempDir, `trickplay-${job.id}-${uuidv4()}`);
  const sourcePath = path.join(jobDir, 'source' + path.extname(sourceKey));
  const thumbDir = path.join(jobDir, 'thumbs');
  const spriteDir = path.join(jobDir, 'sprites');

  fs.mkdirSync(jobDir, { recursive: true });

  try {
    // Download source
    logger.info(`[trickplay:${job.id}] Downloading source: ${sourceBucket}/${sourceKey}`);
    await job.updateProgress(2);
    await storage.downloadFile(sourceBucket, sourceKey, sourcePath);
    await job.updateProgress(10);

    // Get duration
    const duration = await probeDuration(sourcePath);
    logger.info(`[trickplay:${job.id}] Duration: ${duration.toFixed(1)}s, interval: ${interval}s`);
    await job.updateProgress(12);

    // Extract thumbnails
    logger.info(`[trickplay:${job.id}] Extracting thumbnails`);
    const thumbCount = await extractThumbnails(sourcePath, thumbDir, interval);
    logger.info(`[trickplay:${job.id}] Extracted ${thumbCount} thumbnails`);
    await job.updateProgress(60);

    if (thumbCount === 0) {
      throw new Error('No thumbnails extracted from source file');
    }

    // Assemble sprite sheets
    logger.info(`[trickplay:${job.id}] Assembling sprite sheets`);
    const spriteFiles = await assembleSpriteSheets(thumbDir, spriteDir, thumbCount);
    logger.info(`[trickplay:${job.id}] Generated ${spriteFiles.length} sprite sheet(s)`);
    await job.updateProgress(85);

    // Generate VTT
    logger.info(`[trickplay:${job.id}] Generating WebVTT`);
    const vttFile = generateVTT(thumbCount, interval, spriteFiles, spriteDir);
    await job.updateProgress(90);

    // Upload sprites and VTT to MinIO
    logger.info(`[trickplay:${job.id}] Uploading to ${outputBucket}/${outputPrefix}`);

    const spriteUrls = [];
    for (const spriteFile of spriteFiles) {
      const key = outputPrefix
        ? `${outputPrefix}/${spriteFile}`
        : spriteFile;
      await storage.uploadFile(outputBucket, key, path.join(spriteDir, spriteFile));
      const url = await storage.generatePresignedUrl(outputBucket, key);
      spriteUrls.push(url);
    }

    const vttKey = outputPrefix ? `${outputPrefix}/${vttFile}` : vttFile;
    await storage.uploadFile(outputBucket, vttKey, path.join(spriteDir, vttFile));
    const vttUrl = await storage.generatePresignedUrl(outputBucket, vttKey);

    await job.updateProgress(100);

    const result = {
      vttUrl,
      spriteUrls,
      thumbnailCount: thumbCount,
    };

    logger.info(
      `[trickplay:${job.id}] Complete: ${thumbCount} thumbs, ${spriteFiles.length} sprites`,
    );

    return result;
  } finally {
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
}

/**
 * Create and return the BullMQ Worker instance.
 *
 * @param {Object} connection - IORedis connection options
 * @returns {Worker}
 */
function createTrickplayWorker(connection) {
  const worker = new Worker(config.queues.trickplay, processTrickplayJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job, result) => {
    logger.info(
      `[trickplay:${job.id}] Job completed: ${result.thumbnailCount} thumbnails`,
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      `[trickplay:${job?.id}] Job failed: ${err.message}`,
      { error: err.stack },
    );
  });

  worker.on('error', (err) => {
    logger.error(`[trickplay] Worker error: ${err.message}`, {
      error: err.stack,
    });
  });

  return worker;
}

module.exports = { createTrickplayWorker };
