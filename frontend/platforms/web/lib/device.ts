/**
 * Device identification utilities for stream admission and concurrency tracking.
 *
 * Generates a stable, persistent device ID stored in localStorage.
 * The device ID is used by the stream_gateway to enforce per-device concurrency limits.
 */

const DEVICE_ID_KEY = 'ntv_device_id';

/**
 * Gets or generates a persistent device ID for this browser/device.
 *
 * The device ID is stored in localStorage and persists across sessions.
 * If no device ID exists, a new UUID is generated and stored.
 *
 * @returns A stable UUID identifying this device
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    // SSR: return a placeholder (will be replaced client-side)
    return '00000000-0000-0000-0000-000000000000';
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate a new device ID
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (err) {
    // If localStorage is unavailable (privacy mode, quota exceeded, etc.),
    // generate a session-only device ID
    console.warn('Failed to access localStorage for device ID:', err);
    return crypto.randomUUID();
  }
}

/**
 * Resets the device ID (useful for testing or device deregistration).
 *
 * This will cause a new device ID to be generated on the next call to getDeviceId().
 */
export function resetDeviceId(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (err) {
    console.warn('Failed to reset device ID:', err);
  }
}

/**
 * Gets the current device ID without generating a new one.
 *
 * @returns The current device ID, or null if none exists
 */
export function getCurrentDeviceId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch (err) {
    console.warn('Failed to get device ID:', err);
    return null;
  }
}
