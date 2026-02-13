/**
 * Transcode Worker
 *
 * BullMQ worker that consumes the `video:transcode` queue. For each job it:
 *   1. Downloads the source file from MinIO
 *   2. Probes the source with FFprobe
 *   3. Selects renditions from the encoding ladder (never upscale)
 *   4. Transcodes each rendition to HLS (4-second segments, 2-second GOP)
 *   5. Generates an HLS master playlist referencing every variant
 *   6. Uploads all segments and playlists to MinIO
 *   7. Reports granular progress throughout
 */

const { Worker } = require('bullmq');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const storage = require('../storage');
const {
  selectRenditions,
  X264_PARAMS,
  HLS_CONFIG,
} = require('../encoding-ladder');
const logger = require('../logger');

// Point fluent-ffmpeg at the configured binaries
ffmpeg.setFfmpegPath(config.ffmpeg.ffmpegPath);
ffmpeg.setFfprobePath(config.ffmpeg.ffprobePath);

/**
 * Probe a local file with FFprobe and return structured metadata.
 *
 * @param {string} filePath - Absolute path to the media file
 * @returns {Promise<Object>} Probe data
 */
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

/**
 * Transcode a source file into a single HLS rendition.
 *
 * @param {string} sourcePath - Absolute path to the source file
 * @param {string} outputDir  - Directory to write segments and playlist
 * @param {Object} rendition  - Rendition descriptor from encoding ladder
 * @param {number} fps        - Source frame rate (used to calculate GOP in frames)
 * @param {Function} onProgress - Called with percentage (0-100) during encode
 * @returns {Promise<{segmentCount: number, playlistFile: string}>}
 */
function transcodeRendition(sourcePath, outputDir, rendition, fps, onProgress) {
  return new Promise((resolve, reject) => {
    const playlistName = `${rendition.name}.m3u8`;
    const segmentPattern = `${rendition.name}_%05d.ts`;
    const gopFrames = Math.round(fps * HLS_CONFIG.gopDuration);

    fs.mkdirSync(outputDir, { recursive: true });

    const cmd = ffmpeg(sourcePath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(`${rendition.width}x${rendition.height}`)
      .addOutputOptions([
        `-crf ${rendition.crf}`,
        `-profile:v ${rendition.profile}`,
        `-level ${rendition.level}`,
        `-maxrate ${rendition.maxrate}`,
        `-bufsize ${rendition.bufsize}`,
        `-b:a ${rendition.audioBitrate}`,
        `-g ${gopFrames}`,
        `-keyint_min ${gopFrames}`,
        `-sc_threshold 0`,
        `-x264-params ${X264_PARAMS}`,
        `-hls_time ${HLS_CONFIG.segmentDuration}`,
        `-hls_list_size 0`,
        `-hls_segment_type mpegts`,
        `-hls_segment_filename ${path.join(outputDir, segmentPattern)}`,
        `-hls_playlist_type vod`,
        `-f hls`,
      ])
      .output(path.join(outputDir, playlistName));

    cmd.on('progress', (info) => {
      if (info.percent !== undefined) {
        onProgress(Math.min(info.percent, 100));
      }
    });

    cmd.on('end', () => {
      // Count generated .ts segments
      const files = fs.readdirSync(outputDir);
      const segments = files.filter(
        (f) => f.startsWith(rendition.name) && f.endsWith('.ts'),
      );
      resolve({ segmentCount: segments.length, playlistFile: playlistName });
    });

    cmd.on('error', (err) => reject(err));
    cmd.run();
  });
}

/**
 * Generate an HLS master playlist that references all variant stream playlists.
 *
 * @param {Array<Object>} renditions - Array of {rendition, playlistFile} entries
 * @param {string} outputDir - Directory to write the master playlist
 * @returns {string} Filename of the master playlist
 */
function generateMasterPlaylist(renditions, outputDir) {
  const masterFile = 'master.m3u8';
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

  for (const { rendition, playlistFile } of renditions) {
    const maxrateBits =
      parseInt(rendition.maxrate.replace('k', ''), 10) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${maxrateBits},RESOLUTION=${rendition.width}x${rendition.height},NAME="${rendition.name}"\n`;
    content += `${playlistFile}\n`;
  }

  fs.writeFileSync(path.join(outputDir, masterFile), content, 'utf8');
  return masterFile;
}

/**
 * Process a single transcode job.
 *
 * @param {import('bullmq').Job} job
 * @returns {Promise<Object>} Job result
 */
async function processTranscodeJob(job) {
  const {
    sourceBucket,
    sourceKey,
    outputBucket,
    outputPrefix,
    familyId,
    mediaId,
  } = job.data;

  const jobDir = path.join(config.tempDir, `transcode-${job.id}-${uuidv4()}`);
  const sourcePath = path.join(jobDir, 'source' + path.extname(sourceKey));
  const outputDir = path.join(jobDir, 'output');

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // --- Step 1: Download source ---
    logger.info(`[transcode:${job.id}] Downloading source: ${sourceBucket}/${sourceKey}`);
    await job.updateProgress(1);
    await storage.downloadFile(sourceBucket, sourceKey, sourcePath);
    await job.updateProgress(5);

    // --- Step 2: Probe source ---
    logger.info(`[transcode:${job.id}] Probing source file`);
    const probeData = await probeFile(sourcePath);
    const videoStream = probeData.streams.find((s) => s.codec_type === 'video');
    if (!videoStream) {
      throw new Error('No video stream found in source file');
    }

    const sourceWidth = videoStream.width;
    const sourceHeight = videoStream.height;
    const duration = parseFloat(probeData.format.duration) || 0;
    const fps = evalFrameRate(videoStream.r_frame_rate) || 24;
    await job.updateProgress(8);

    logger.info(
      `[transcode:${job.id}] Source: ${sourceWidth}x${sourceHeight}, ` +
      `${duration.toFixed(1)}s, ${fps.toFixed(2)} fps`,
    );

    // --- Step 3: Select renditions ---
    const applicableRenditions = selectRenditions(sourceWidth, sourceHeight);
    if (applicableRenditions.length === 0) {
      throw new Error(
        `Source resolution ${sourceWidth}x${sourceHeight} is too small for any rendition`,
      );
    }

    logger.info(
      `[transcode:${job.id}] Selected ${applicableRenditions.length} renditions: ` +
      applicableRenditions.map((r) => r.name).join(', '),
    );

    // --- Step 4: Transcode each rendition ---
    const completedRenditions = [];
    let totalSegments = 0;

    // Reserve 8% for download/probe, 87% for transcoding, 5% for upload
    const transcodeStart = 8;
    const transcodeEnd = 95;
    const perRenditionRange =
      (transcodeEnd - transcodeStart) / applicableRenditions.length;

    for (let i = 0; i < applicableRenditions.length; i++) {
      const rendition = applicableRenditions[i];
      const renditionBaseProgress = transcodeStart + i * perRenditionRange;

      logger.info(
        `[transcode:${job.id}] Encoding rendition ${i + 1}/${applicableRenditions.length}: ${rendition.name} (${rendition.width}x${rendition.height})`,
      );

      const result = await transcodeRendition(
        sourcePath,
        outputDir,
        rendition,
        fps,
        (percent) => {
          const scaled =
            renditionBaseProgress + (percent / 100) * perRenditionRange;
          job.updateProgress(Math.round(scaled));
        },
      );

      totalSegments += result.segmentCount;
      completedRenditions.push({
        rendition,
        playlistFile: result.playlistFile,
        segmentCount: result.segmentCount,
      });
    }

    // --- Step 5: Generate master playlist ---
    logger.info(`[transcode:${job.id}] Generating master playlist`);
    const masterPlaylistFile = generateMasterPlaylist(
      completedRenditions,
      outputDir,
    );

    // --- Step 6: Upload everything to MinIO ---
    logger.info(`[transcode:${job.id}] Uploading to ${outputBucket}/${outputPrefix}`);
    await job.updateProgress(95);

    const outputFiles = fs.readdirSync(outputDir);
    for (let i = 0; i < outputFiles.length; i++) {
      const file = outputFiles[i];
      const objectKey = outputPrefix
        ? `${outputPrefix}/${file}`
        : file;
      await storage.uploadFile(
        outputBucket,
        objectKey,
        path.join(outputDir, file),
      );
    }

    await job.updateProgress(100);

    // --- Build result ---
    const masterPlaylistUrl = await storage.generatePresignedUrl(
      outputBucket,
      outputPrefix ? `${outputPrefix}/${masterPlaylistFile}` : masterPlaylistFile,
    );

    const renditionResults = [];
    for (const { rendition, playlistFile } of completedRenditions) {
      const key = outputPrefix
        ? `${outputPrefix}/${playlistFile}`
        : playlistFile;
      const playlistUrl = await storage.generatePresignedUrl(outputBucket, key);
      renditionResults.push({
        name: rendition.name,
        width: rendition.width,
        height: rendition.height,
        tier: rendition.tier,
        playlistUrl,
      });
    }

    const result = {
      masterPlaylistUrl,
      renditions: renditionResults,
      duration,
      segmentCount: totalSegments,
      familyId: familyId || null,
      mediaId: mediaId || null,
    };

    logger.info(
      `[transcode:${job.id}] Complete: ${renditionResults.length} renditions, ` +
      `${totalSegments} segments, ${duration.toFixed(1)}s`,
    );

    return result;
  } finally {
    // Clean up temp files
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
}

/**
 * Evaluate an FFprobe frame rate string like "30000/1001" to a float.
 *
 * @param {string} rateStr
 * @returns {number}
 */
function evalFrameRate(rateStr) {
  if (!rateStr) return 24;
  const parts = rateStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (den > 0) return num / den;
  }
  return parseFloat(rateStr) || 24;
}

/**
 * Create and return the BullMQ Worker instance.
 *
 * @param {Object} connection - IORedis connection options
 * @returns {Worker}
 */
function createTranscodeWorker(connection) {
  const worker = new Worker(config.queues.transcode, processTranscodeJob, {
    connection,
    concurrency: config.worker.concurrency,
    removeOnComplete: config.worker.removeOnComplete,
    removeOnFail: config.worker.removeOnFail,
  });

  worker.on('completed', (job, result) => {
    logger.info(
      `[transcode:${job.id}] Job completed: ${result.renditions.length} renditions`,
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      `[transcode:${job?.id}] Job failed: ${err.message}`,
      { error: err.stack },
    );
  });

  worker.on('error', (err) => {
    logger.error(`[transcode] Worker error: ${err.message}`, {
      error: err.stack,
    });
  });

  return worker;
}

module.exports = { createTranscodeWorker };
