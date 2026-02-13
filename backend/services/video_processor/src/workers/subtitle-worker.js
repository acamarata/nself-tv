/**
 * Subtitle Worker
 *
 * BullMQ worker that consumes the `video:subtitle` queue. For each job it:
 *   1. Downloads the source file from MinIO
 *   2. Uses FFprobe to detect all subtitle streams
 *   3. Extracts each subtitle stream with FFmpeg
 *   4. Converts each to WebVTT format
 *   5. Uploads to MinIO
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

/**
 * Probe a file and return all subtitle stream metadata.
 *
 * @param {string} filePath
 * @returns {Promise<Array<Object>>} Array of subtitle stream descriptors
 */
function probeSubtitles(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const subtitleStreams = data.streams
        .filter((s) => s.codec_type === 'subtitle')
        .map((s, idx) => ({
          index: s.index,
          codecName: s.codec_name,
          language: (s.tags && s.tags.language) || 'und',
          title: (s.tags && s.tags.title) || null,
          streamIndex: idx,
        }));

      resolve(subtitleStreams);
    });
  });
}

/**
 * Extract a single subtitle stream from a media file to WebVTT.
 *
 * For text-based subtitle codecs (subrip, ass, ssa, webvtt, mov_text) the
 * extraction is done directly to WebVTT. For bitmap-based codecs
 * (dvd_subtitle, hdmv_pgs_subtitle, dvb_subtitle), extraction is skipped
 * as they cannot be converted to WebVTT without OCR.
 *
 * @param {string} sourcePath - Path to the source media file
 * @param {Object} stream     - Subtitle stream descriptor from probeSubtitles
 * @param {string} outputPath - Path to write the .vtt file
 * @returns {Promise<boolean>} True if extraction succeeded, false if skipped
 */
function extractSubtitle(sourcePath, stream, outputPath) {
  return new Promise((resolve, reject) => {
    const bitmapCodecs = [
      'dvd_subtitle',
      'dvdsub',
      'hdmv_pgs_subtitle',
      'pgssub',
      'dvb_subtitle',
      'dvbsub',
      'xsub',
    ];

    if (bitmapCodecs.includes(stream.codecName)) {
      logger.warn(
        `Skipping bitmap subtitle stream ${stream.index} (${stream.codecName}) - OCR required`,
      );
      resolve(false);
      return;
    }

    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    const cmd = ffmpeg(sourcePath)
      .outputOptions([`-map 0:${stream.index}`, '-c:s webvtt'])
      .output(outputPath);

    cmd.on('end', () => resolve(true));
    cmd.on('error', (err) => {
      // Some subtitle codecs fail silently; treat as skip
      logger.warn(
        `Failed to extract subtitle stream ${stream.index}: ${err.message}`,
      );
      resolve(false);
    });
    cmd.run();
  });
}

/**
 * Build a human-readable label for a subtitle stream.
 *
 * @param {Object} stream - Subtitle stream descriptor
 * @returns {string}
 */
function buildLabel(stream) {
  const langNames = {
    eng: 'English',
    spa: 'Spanish',
    fra: 'French',
    deu: 'German',
    ita: 'Italian',
    por: 'Portuguese',
    rus: 'Russian',
    jpn: 'Japanese',
    kor: 'Korean',
    zho: 'Chinese',
    chi: 'Chinese',
    ara: 'Arabic',
    hin: 'Hindi',
    tur: 'Turkish',
    pol: 'Polish',
    nld: 'Dutch',
    swe: 'Swedish',
    nor: 'Norwegian',
    dan: 'Danish',
    fin: 'Finnish',
    ces: 'Czech',
    hun: 'Hungarian',
    ron: 'Romanian',
    tha: 'Thai',
    vie: 'Vietnamese',
    ind: 'Indonesian',
    msa: 'Malay',
    heb: 'Hebrew',
    ukr: 'Ukrainian',
    und: 'Unknown',
  };

  if (stream.title) return stream.title;
  return langNames[stream.language] || stream.language;
}

/**
 * Process a single subtitle extraction job.
 *
 * @param {import('bullmq').Job} job
 * @returns {Promise<Object>}
 */
async function processSubtitleJob(job) {
  const {
    sourceBucket,
    sourceKey,
    outputBucket,
    outputPrefix,
  } = job.data;

  const jobDir = path.join(config.tempDir, `subtitle-${job.id}-${uuidv4()}`);
  const sourcePath = path.join(jobDir, 'source' + path.extname(sourceKey));
  const outputDir = path.join(jobDir, 'output');

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Download source
    logger.info(`[subtitle:${job.id}] Downloading source: ${sourceBucket}/${sourceKey}`);
    await job.updateProgress(5);
    await storage.downloadFile(sourceBucket, sourceKey, sourcePath);
    await job.updateProgress(15);

    // Probe for subtitle streams
    logger.info(`[subtitle:${job.id}] Probing subtitle streams`);
    const subtitleStreams = await probeSubtitles(sourcePath);
    await job.updateProgress(20);

    if (subtitleStreams.length === 0) {
      logger.info(`[subtitle:${job.id}] No subtitle streams found`);
      await job.updateProgress(100);
      return { subtitles: [] };
    }

    logger.info(
      `[subtitle:${job.id}] Found ${subtitleStreams.length} subtitle stream(s): ` +
      subtitleStreams.map((s) => `${s.language}(${s.codecName})`).join(', '),
    );

    // Extract each subtitle stream
    const subtitles = [];
    const progressPerStream = 75 / subtitleStreams.length;

    for (let i = 0; i < subtitleStreams.length; i++) {
      const stream = subtitleStreams[i];
      const vttFilename = `sub_${stream.language}_${stream.index}.vtt`;
      const vttPath = path.join(outputDir, vttFilename);

      logger.info(
        `[subtitle:${job.id}] Extracting stream ${i + 1}/${subtitleStreams.length}: ` +
        `${stream.language} (${stream.codecName})`,
      );

      const extracted = await extractSubtitle(sourcePath, stream, vttPath);

      if (extracted && fs.existsSync(vttPath)) {
        // Upload to MinIO
        const objectKey = outputPrefix
          ? `${outputPrefix}/${vttFilename}`
          : vttFilename;

        await storage.uploadFile(outputBucket, objectKey, vttPath);
        const url = await storage.generatePresignedUrl(outputBucket, objectKey);

        subtitles.push({
          language: stream.language,
          label: buildLabel(stream),
          url,
          index: stream.index,
        });
      }

      await job.updateProgress(Math.round(20 + (i + 1) * progressPerStream));
    }

    await job.updateProgress(100);

    const result = { subtitles };

    logger.info(
      `[subtitle:${job.id}] Complete: extracted ${subtitles.length}/${subtitleStreams.length} subtitle tracks`,
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
function createSubtitleWorker(connection) {
  const worker = new Worker(config.queues.subtitle, processSubtitleJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job, result) => {
    logger.info(
      `[subtitle:${job.id}] Job completed: ${result.subtitles.length} tracks extracted`,
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      `[subtitle:${job?.id}] Job failed: ${err.message}`,
      { error: err.stack },
    );
  });

  worker.on('error', (err) => {
    logger.error(`[subtitle] Worker error: ${err.message}`, {
      error: err.stack,
    });
  });

  return worker;
}

module.exports = { createSubtitleWorker };
