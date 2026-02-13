/**
 * Player error classification and retry management.
 *
 * Classifies HLS error events into recoverable/fatal categories and
 * manages retry counts per error type.
 */

export enum ErrorSeverity {
  RECOVERABLE = 'recoverable',
  FATAL = 'fatal',
}

export interface PlayerError {
  /** Error type category (e.g. 'networkError', 'mediaError'). */
  type: string;
  /** Whether the error is recoverable or fatal. */
  severity: ErrorSeverity;
  /** Human-readable error message. */
  message: string;
  /** Whether the error can be retried. */
  retryable: boolean;
  /** Optional additional error details. */
  details?: unknown;
}

/**
 * Handles player error classification and retry logic.
 *
 * Uses string constants for error types and details rather than importing
 * HLS.js enums directly, keeping the error handler framework-agnostic.
 */
export class PlayerErrorHandler {
  private retryCount: Map<string, number>;
  private maxRetries: number;

  /**
   * @param maxRetries - Maximum number of retries allowed per error type (default 3)
   */
  constructor(maxRetries: number = 3) {
    this.retryCount = new Map();
    this.maxRetries = maxRetries;
  }

  /**
   * Classifies an HLS error event into a structured PlayerError.
   *
   * @param data - Raw error data with type, details, and fatal flag
   * @returns Classified PlayerError with severity, retryability, and message
   */
  classifyError(data: { type: string; details: string; fatal: boolean }): PlayerError {
    const { type, details, fatal } = data;

    if (type === 'networkError' && details === 'manifestLoadError') {
      return {
        type,
        severity: ErrorSeverity.FATAL,
        message: 'Failed to load video',
        retryable: true,
        details: data,
      };
    }

    if (type === 'networkError' && details === 'fragLoadError') {
      return {
        type,
        severity: ErrorSeverity.RECOVERABLE,
        message: 'Video segment failed to load',
        retryable: true,
        details: data,
      };
    }

    if (type === 'mediaError' && details === 'bufferStalledError') {
      return {
        type,
        severity: ErrorSeverity.RECOVERABLE,
        message: 'Playback stalled',
        retryable: true,
        details: data,
      };
    }

    if (type === 'mediaError' && details === 'bufferAppendError') {
      return {
        type,
        severity: ErrorSeverity.FATAL,
        message: 'Media format not supported',
        retryable: false,
        details: data,
      };
    }

    if (type === 'muxError') {
      return {
        type,
        severity: ErrorSeverity.FATAL,
        message: 'Media format error',
        retryable: false,
        details: data,
      };
    }

    return {
      type,
      severity: fatal ? ErrorSeverity.FATAL : ErrorSeverity.RECOVERABLE,
      message: 'An unexpected error occurred',
      retryable: true,
      details: data,
    };
  }

  /**
   * Checks whether a retry should be attempted for the given error.
   *
   * @param error - The classified player error
   * @returns true if the error is retryable and has not exceeded max retries
   */
  shouldRetry(error: PlayerError): boolean {
    if (!error.retryable) {
      return false;
    }

    const key = `${error.type}:${(error.details as { details?: string })?.details ?? 'unknown'}`;
    const count = this.retryCount.get(key) ?? 0;
    return count < this.maxRetries;
  }

  /**
   * Records a retry attempt for the given error type.
   *
   * @param error - The classified player error
   */
  recordRetry(error: PlayerError): void {
    const key = `${error.type}:${(error.details as { details?: string })?.details ?? 'unknown'}`;
    const count = this.retryCount.get(key) ?? 0;
    this.retryCount.set(key, count + 1);
  }

  /**
   * Resets all retry counters. Call this when playback recovers or a new
   * source is loaded.
   */
  resetRetries(): void {
    this.retryCount.clear();
  }
}
