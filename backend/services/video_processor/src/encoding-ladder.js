/**
 * Encoding ladder definitions for adaptive bitrate streaming.
 *
 * Provides a standard set of renditions from 240p to 8K, x264 tuning
 * parameters, and HLS packaging constants. The `selectRenditions` function
 * enforces the never-upscale rule: only renditions whose dimensions fit within
 * the source resolution are returned.
 */

/** Full 8-rendition encoding ladder (7 video renditions; audio-only is handled separately) */
const ENCODING_LADDER = [
  {
    name: 'r240',
    width: 426,
    height: 240,
    crf: 23,
    profile: 'baseline',
    level: '2.1',
    audioBitrate: '64k',
    maxrate: '300k',
    bufsize: '600k',
    tier: 'LD',
  },
  {
    name: 'r360',
    width: 640,
    height: 360,
    crf: 22,
    profile: 'main',
    level: '3.0',
    audioBitrate: '96k',
    maxrate: '800k',
    bufsize: '1600k',
    tier: 'SD',
  },
  {
    name: 'r480',
    width: 854,
    height: 480,
    crf: 21,
    profile: 'main',
    level: '3.1',
    audioBitrate: '128k',
    maxrate: '1400k',
    bufsize: '2800k',
    tier: 'SD',
  },
  {
    name: 'r720',
    width: 1280,
    height: 720,
    crf: 20,
    profile: 'high',
    level: '4.0',
    audioBitrate: '128k',
    maxrate: '3000k',
    bufsize: '6000k',
    tier: 'HD',
  },
  {
    name: 'r1080',
    width: 1920,
    height: 1080,
    crf: 19,
    profile: 'high',
    level: '4.1',
    audioBitrate: '192k',
    maxrate: '6000k',
    bufsize: '12000k',
    tier: 'FHD',
  },
  {
    name: 'r2160',
    width: 3840,
    height: 2160,
    crf: 18,
    profile: 'high',
    level: '5.1',
    audioBitrate: '256k',
    maxrate: '16000k',
    bufsize: '32000k',
    tier: 'UHD',
  },
  {
    name: 'r4320',
    width: 7680,
    height: 4320,
    crf: 17,
    profile: 'high',
    level: '6.0',
    audioBitrate: '256k',
    maxrate: '40000k',
    bufsize: '80000k',
    tier: 'UHD8K',
  },
];

/**
 * x264 advanced tuning parameters for high quality encoding.
 *
 * - rc-lookahead=60   : Look-ahead frames for ratecontrol decisions
 * - me=umh            : Uneven multi-hex motion estimation (good quality/speed balance)
 * - subme=10          : Sub-pixel motion estimation refinement (high quality)
 * - merange=32        : Motion estimation search range in pixels
 * - aq-mode=3         : Adaptive quantization — auto-variance AQ (best for detail)
 * - qcomp=0.9         : Quantizer curve compression (higher = more constant quality)
 * - b-adapt=2         : Adaptive B-frame placement with full trellis (best quality)
 * - qpmin=3           : Minimum quantiser to prevent wasted bits on flat areas
 */
const X264_PARAMS = [
  'rc-lookahead=60',
  'me=umh',
  'subme=10',
  'merange=32',
  'aq-mode=3',
  'qcomp=0.9',
  'b-adapt=2',
  'qpmin=3',
].join(':');

/** HLS packaging constants */
const HLS_CONFIG = {
  /** Target segment duration in seconds */
  segmentDuration: 4,
  /** GOP duration in seconds (keyframe interval). GOP = segmentDuration / gopDuration keyframes per segment. */
  gopDuration: 2,
};

/**
 * Select renditions that do not exceed the source resolution.
 * Never upscale: a rendition is included only when both its width and height
 * are less than or equal to the source dimensions.
 *
 * @param {number} sourceWidth  - Source video width in pixels
 * @param {number} sourceHeight - Source video height in pixels
 * @returns {Array} Array of applicable rendition objects (subset of ENCODING_LADDER)
 */
function selectRenditions(sourceWidth, sourceHeight) {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    return [];
  }

  return ENCODING_LADDER.filter(
    (r) => r.width <= sourceWidth && r.height <= sourceHeight,
  );
}

/**
 * Classify a resolution into a quality tier label.
 *
 * @param {number} width  - Video width in pixels
 * @param {number} height - Video height in pixels
 * @returns {string} Quality tier: 'LD', 'SD', 'HD', 'FHD', 'UHD', or 'UHD8K'
 */
function getQualityTier(width, height) {
  if (width >= 7680 || height >= 4320) return 'UHD8K';
  if (width >= 3840 || height >= 2160) return 'UHD';
  if (width >= 1920 || height >= 1080) return 'FHD';
  if (width >= 1280 || height >= 720) return 'HD';
  if (width >= 640 || height >= 360) return 'SD';
  return 'LD';
}

module.exports = {
  ENCODING_LADDER,
  X264_PARAMS,
  HLS_CONFIG,
  selectRenditions,
  getQualityTier,
};
