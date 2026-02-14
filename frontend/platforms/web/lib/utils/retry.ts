/**
 * Retry utility with exponential backoff.
 * Retries a function multiple times with increasing delays between attempts.
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (excluding the initial attempt).
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before the first retry.
   * Default: 1000 (1 second)
   */
  initialDelay?: number;

  /**
   * Multiplier for exponential backoff.
   * Each retry waits initialDelay * (backoffMultiplier ^ retryCount) ms.
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay in milliseconds between retries.
   * Default: 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Function to determine if an error should trigger a retry.
   * Return true to retry, false to throw immediately.
   * Default: Always retry
   */
  shouldRetry?: (error: unknown) => boolean;

  /**
   * Callback invoked before each retry attempt.
   * Receives the error and retry count.
   */
  onRetry?: (error: unknown, retryCount: number) => void;
}

/**
 * Retries an async function with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries exhausted
 *
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => fetch('/api/data').then(r => r.json()),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     shouldRetry: (err) => err instanceof NetworkError,
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Don't retry if shouldRetry returns false
      if (!shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay,
      );

      // Invoke retry callback if provided
      onRetry?.(error, attempt + 1);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Common retry options for network requests.
 * Retries on network errors and 5xx server errors, but not on 4xx client errors.
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  shouldRetry: (error) => {
    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Retry on 5xx server errors (if error has status property)
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
    ) {
      return error.statusCode >= 500 && error.statusCode < 600;
    }

    // Don't retry on other errors (4xx, etc.)
    return false;
  },
};
