/**
 * Formats a time value in seconds to HH:MM:SS or MM:SS string.
 *
 * @param seconds - Time value in seconds (may be NaN, Infinity, or negative)
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Parses a time string (HH:MM:SS or MM:SS) back to seconds.
 *
 * @param time - Formatted time string
 * @returns Time in seconds
 */
export function parseTime(time: string): number {
  const parts = time.split(':').map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * Calculates the percentage of current time relative to duration.
 *
 * @param currentTime - Current playback time in seconds
 * @param duration - Total duration in seconds
 * @returns Percentage value between 0 and 100
 */
export function timeToPercent(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (currentTime / duration) * 100));
}
