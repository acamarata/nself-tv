/**
 * Completion threshold percentage
 * Content is considered "completed" when watch progress reaches this percentage
 */
export const COMPLETION_THRESHOLD = 95;

/**
 * Calculate watch progress percentage from current time and duration
 *
 * @param currentTime - Current playback position in seconds
 * @param duration - Total content duration in seconds
 * @returns Progress percentage (0-100), or 0 if invalid inputs
 *
 * @example
 * calculateWatchProgress(5700, 6000) // 95
 * calculateWatchProgress(3000, 6000) // 50
 * calculateWatchProgress(0, 6000)    // 0
 */
export function calculateWatchProgress(currentTime: number, duration: number): number {
  // Handle invalid inputs
  if (duration <= 0 || !Number.isFinite(duration)) {
    return 0;
  }

  if (currentTime < 0 || !Number.isFinite(currentTime)) {
    return 0;
  }

  // Cap progress at 100%
  const progress = (currentTime / duration) * 100;
  return Math.min(Math.round(progress), 100);
}

/**
 * Check if content is completed based on watch progress
 *
 * Content is completed when progress >= 95%
 *
 * @param progress - Watch progress percentage (0-100)
 * @returns True if progress >= 95%
 *
 * @example
 * isCompleted(95)   // true
 * isCompleted(94.9) // false
 * isCompleted(100)  // true
 */
export function isCompleted(progress: number): boolean {
  return progress >= COMPLETION_THRESHOLD;
}

/**
 * Calculate remaining time in seconds
 *
 * @param currentTime - Current playback position in seconds
 * @param duration - Total content duration in seconds
 * @returns Remaining time in seconds, or 0 if invalid
 */
export function getRemainingTime(currentTime: number, duration: number): number {
  if (duration <= 0 || currentTime < 0 || currentTime > duration) {
    return 0;
  }

  return Math.max(0, duration - currentTime);
}

/**
 * Format time in seconds to human-readable string (HH:MM:SS or MM:SS)
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 *
 * @example
 * formatTime(3661) // '1:01:01'
 * formatTime(125)  // '2:05'
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate resume position with smart logic:
 * - If progress < 3%, start from beginning
 * - If progress >= 95%, start from beginning (user likely wants to rewatch)
 * - Otherwise, resume from saved position
 *
 * @param currentTime - Saved playback position in seconds
 * @param duration - Total content duration in seconds
 * @returns Position to resume from in seconds
 */
export function getResumePosition(currentTime: number, duration: number): number {
  const progress = calculateWatchProgress(currentTime, duration);

  // Start from beginning if barely started or already completed
  if (progress < 3 || progress >= COMPLETION_THRESHOLD) {
    return 0;
  }

  return currentTime;
}
