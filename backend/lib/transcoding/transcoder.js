/**
 * Video Transcoding Service
 * Handles video transcoding with hardware acceleration support
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const { createLogger } = require('../logger');

const logger = createLogger('transcoder');

class Transcoder extends EventEmitter {
  constructor(config = {}) {
    super();
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
    this.hwAccel = config.hwAccel || 'auto'; // auto, qsv, nvenc, vaapi, none
    this.preset = config.preset || 'fast';
    this.maxSessions = config.maxSessions || 2;
    this.activeSessions = new Map();
  }

  /**
   * Transcode video file
   */
  async transcode(inputPath, outputPath, options = {}) {
    if (this.activeSessions.size >= this.maxSessions) {
      throw new Error(`Max transcoding sessions reached (${this.maxSessions})`);
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const args = this.buildFFmpegArgs(inputPath, outputPath, options);

      logger.info('Starting transcode', {
        sessionId,
        inputPath,
        outputPath,
        hwAccel: this.hwAccel,
      });

      const ffmpeg = spawn(this.ffmpegPath, args);

      this.activeSessions.set(sessionId, {
        process: ffmpeg,
        inputPath,
        outputPath,
        startTime: Date.now(),
      });

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        this.parseProgress(sessionId, stderr);
      });

      ffmpeg.on('close', (code) => {
        this.activeSessions.delete(sessionId);

        if (code === 0) {
          logger.info('Transcode complete', { sessionId, outputPath });
          this.emit('complete', { sessionId, outputPath });
          resolve(outputPath);
        } else {
          logger.error('Transcode failed', { sessionId, code, stderr });
          this.emit('error', { sessionId, code, stderr });
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.activeSessions.delete(sessionId);
        logger.error('FFmpeg spawn error', { sessionId, error: error.message });
        this.emit('error', { sessionId, error });
        reject(error);
      });
    });
  }

  /**
   * Build FFmpeg arguments based on hardware acceleration
   */
  buildFFmpegArgs(inputPath, outputPath, options) {
    const args = [];

    // Hardware acceleration setup
    if (this.hwAccel !== 'none') {
      if (this.hwAccel === 'qsv' || this.hwAccel === 'auto') {
        args.push('-hwaccel', 'qsv', '-c:v', 'h264_qsv');
      } else if (this.hwAccel === 'nvenc') {
        args.push('-hwaccel', 'cuda', '-c:v', 'h264_nvenc');
      } else if (this.hwAccel === 'vaapi') {
        args.push('-vaapi_device', '/dev/dri/renderD128', '-hwaccel', 'vaapi');
      }
    }

    // Input
    args.push('-i', inputPath);

    // Video codec
    const videoCodec = options.videoCodec || this.getVideoCodec();
    args.push('-c:v', videoCodec);

    // Preset
    if (videoCodec.includes('264')) {
      args.push('-preset', this.preset);
    }

    // Resolution
    if (options.resolution) {
      args.push('-vf', `scale=${options.resolution}`);
    }

    // Bitrate
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }

    // Audio codec
    args.push('-c:a', options.audioCodec || 'aac');
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }

    // Output format
    if (options.format) {
      args.push('-f', options.format);
    }

    // Progress reporting
    args.push('-progress', 'pipe:2');

    // Output
    args.push(outputPath);

    return args;
  }

  /**
   * Get video codec based on hardware acceleration
   */
  getVideoCodec() {
    if (this.hwAccel === 'qsv') return 'h264_qsv';
    if (this.hwAccel === 'nvenc') return 'h264_nvenc';
    if (this.hwAccel === 'vaapi') return 'h264_vaapi';
    return 'libx264';
  }

  /**
   * Parse FFmpeg progress output
   */
  parseProgress(sessionId, stderr) {
    // Extract progress info from stderr
    const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      this.emit('progress', {
        sessionId,
        time: totalSeconds,
      });
    }
  }

  /**
   * Cancel transcoding session
   */
  async cancel(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.process.kill('SIGTERM');
    this.activeSessions.delete(sessionId);

    logger.info('Transcode canceled', { sessionId });
    this.emit('canceled', { sessionId });
  }

  /**
   * Get active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([id, session]) => ({
      id,
      inputPath: session.inputPath,
      outputPath: session.outputPath,
      duration: Date.now() - session.startTime,
    }));
  }

  /**
   * Check hardware acceleration availability
   */
  static async checkHWAccel() {
    const results = {
      qsv: false,
      nvenc: false,
      vaapi: false,
    };

    // Check for Intel QuickSync
    try {
      const fs = require('fs');
      if (fs.existsSync('/dev/dri/renderD128')) {
        results.qsv = true;
        results.vaapi = true;
      }
    } catch (e) {
      // Not available
    }

    // Check for NVIDIA
    try {
      const { execSync } = require('child_process');
      execSync('nvidia-smi', { stdio: 'ignore' });
      results.nvenc = true;
    } catch (e) {
      // Not available
    }

    return results;
  }
}

module.exports = { Transcoder };
