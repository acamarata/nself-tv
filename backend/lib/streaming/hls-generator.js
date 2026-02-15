/**
 * HLS (HTTP Live Streaming) Generator
 * Generates HLS playlists and segments from media files
 */

const { spawn } = require('child_process');
const { createLogger } = require('../logger');

const logger = createLogger('hls-generator');

class HLSGenerator {
  constructor(config = {}) {
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
    this.segmentDuration = config.segmentDuration || 6;
    this.outputDir = config.outputDir || '/tmp/hls';
  }

  /**
   * Generate HLS stream from video file
   */
  async generateHLS(inputPath, outputName) {
    return new Promise((resolve, reject) => {
      const outputPath = `${this.outputDir}/${outputName}`;
      const playlistPath = `${outputPath}/playlist.m3u8`;

      const args = [
        '-i', inputPath,
        '-codec:v', 'libx264',
        '-codec:a', 'aac',
        '-hls_time', this.segmentDuration.toString(),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', `${outputPath}/segment%03d.ts`,
        '-start_number', '0',
        playlistPath,
      ];

      logger.info('Generating HLS stream', { inputPath, outputPath });

      const ffmpeg = spawn(this.ffmpegPath, args);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info('HLS generation complete', { playlistPath });
          resolve(playlistPath);
        } else {
          logger.error('HLS generation failed', { code });
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        logger.error('FFmpeg spawn error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Generate adaptive bitrate HLS (multiple qualities)
   */
  async generateAdaptiveHLS(inputPath, outputName) {
    const qualities = [
      { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
      { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
      { name: '480p', width: 854, height: 480, bitrate: '1400k' },
    ];

    const playlists = [];

    for (const quality of qualities) {
      const outputPath = `${this.outputDir}/${outputName}/${quality.name}`;
      const playlistPath = await this.generateQualityVariant(inputPath, outputPath, quality);
      playlists.push({ quality: quality.name, path: playlistPath });
    }

    // Generate master playlist
    const masterPath = await this.generateMasterPlaylist(outputName, playlists);

    return { master: masterPath, variants: playlists };
  }

  /**
   * Generate single quality variant
   */
  async generateQualityVariant(inputPath, outputPath, quality) {
    return new Promise((resolve, reject) => {
      const playlistPath = `${outputPath}/playlist.m3u8`;

      const args = [
        '-i', inputPath,
        '-vf', `scale=${quality.width}:${quality.height}`,
        '-c:v', 'libx264',
        '-b:v', quality.bitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-hls_time', this.segmentDuration.toString(),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', `${outputPath}/segment%03d.ts`,
        playlistPath,
      ];

      const ffmpeg = spawn(this.ffmpegPath, args);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(playlistPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Generate master playlist for adaptive streaming
   */
  async generateMasterPlaylist(outputName, variants) {
    const masterPath = `${this.outputDir}/${outputName}/master.m3u8`;

    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const variant of variants) {
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${this.getBandwidth(variant.quality)}\n`;
      content += `${variant.quality}/playlist.m3u8\n\n`;
    }

    require('fs').writeFileSync(masterPath, content);

    return masterPath;
  }

  /**
   * Get bandwidth for quality level
   */
  getBandwidth(quality) {
    const bandwidths = {
      '1080p': 5000000,
      '720p': 2800000,
      '480p': 1400000,
    };
    return bandwidths[quality] || 2800000;
  }
}

module.exports = { HLSGenerator };
