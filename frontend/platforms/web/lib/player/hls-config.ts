import Hls from 'hls.js';

/**
 * Creates a configured HLS.js instance with sensible defaults for VOD playback.
 *
 * @param overrides - Partial HLS config to merge with defaults
 * @returns Configured Hls instance
 */
export function createHlsInstance(overrides?: Partial<typeof Hls.DefaultConfig>): Hls {
  return new Hls({
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 90,
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    manifestLoadingTimeOut: 10000,
    manifestLoadingMaxRetry: 3,
    levelLoadingTimeOut: 10000,
    levelLoadingMaxRetry: 4,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    ...overrides,
  });
}

/**
 * Checks whether the browser supports MSE-based HLS playback via hls.js.
 *
 * @returns true if HLS.js can be used in this environment
 */
export function isHlsSupported(): boolean {
  return Hls.isSupported();
}

/**
 * Checks whether the browser supports native HLS playback (Safari, iOS).
 *
 * @returns true if the browser can play HLS natively via the video element
 */
export function isNativeHlsSupported(): boolean {
  const video = document.createElement('video');
  return !!video.canPlayType('application/vnd.apple.mpegurl');
}
