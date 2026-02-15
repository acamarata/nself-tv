/**
 * Error monitoring and handling utilities
 * Production error tracking, user-friendly error messages, and error recovery
 */

// Error types
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  userId?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

// Error monitoring service
class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errors: ErrorDetails[] = [];
  private maxErrors = 100;
  private onErrorCallback?: (error: ErrorDetails) => void;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalHandlers();
    }
  }

  static getInstance(): ErrorMonitor {
    if (!this.instance) {
      this.instance = new ErrorMonitor();
    }
    return this.instance;
  }

  private initGlobalHandlers() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        severity: ErrorSeverity.HIGH,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        severity: ErrorSeverity.MEDIUM,
        context: { type: 'unhandledrejection' },
      });
    });
  }

  captureError(error: Error | string, options: {
    severity?: ErrorSeverity;
    context?: Record<string, any>;
    userId?: string;
  } = {}) {
    const errorDetails: ErrorDetails = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      severity: options.severity || ErrorSeverity.MEDIUM,
      context: options.context,
      userId: options.userId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Store error
    this.errors.push(errorDetails);

    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorMonitor]', errorDetails);
    }

    // Send to monitoring service (would integrate with Sentry, DataDog, etc.)
    this.sendToMonitoring(errorDetails);

    // Trigger callback
    if (this.onErrorCallback) {
      this.onErrorCallback(errorDetails);
    }
  }

  private async sendToMonitoring(error: ErrorDetails) {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        });
      } catch (err) {
        console.error('Failed to send error to monitoring:', err);
      }
    }
  }

  onError(callback: (error: ErrorDetails) => void) {
    this.onErrorCallback = callback;
  }

  getErrors(severity?: ErrorSeverity): ErrorDetails[] {
    if (severity) {
      return this.errors.filter(e => e.severity === severity);
    }
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    return {
      total: this.errors.length,
      bySeverity: {
        [ErrorSeverity.LOW]: this.errors.filter(e => e.severity === ErrorSeverity.LOW).length,
        [ErrorSeverity.MEDIUM]: this.errors.filter(e => e.severity === ErrorSeverity.MEDIUM).length,
        [ErrorSeverity.HIGH]: this.errors.filter(e => e.severity === ErrorSeverity.HIGH).length,
        [ErrorSeverity.CRITICAL]: this.errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
      },
      recent: this.errors.filter(e => e.timestamp >= oneHourAgo).length,
    };
  }
}

// Export singleton
export const errorMonitor = ErrorMonitor.getInstance();

// User-friendly error messages
export const ErrorMessages = {
  network: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry',
  },
  authentication: {
    title: 'Authentication Required',
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign In',
  },
  notFound: {
    title: 'Not Found',
    message: 'The content you\'re looking for doesn\'t exist or has been removed.',
    action: 'Go Home',
  },
  permission: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this content.',
    action: 'Go Back',
  },
  server: {
    title: 'Server Error',
    message: 'Something went wrong on our end. We\'re working to fix it.',
    action: 'Retry',
  },
  validation: {
    title: 'Invalid Input',
    message: 'Please check your information and try again.',
    action: 'OK',
  },
  playback: {
    title: 'Playback Error',
    message: 'Unable to play this content. The file may be corrupted or in an unsupported format.',
    action: 'Try Another',
  },
  storage: {
    title: 'Storage Full',
    message: 'Not enough storage space. Please free up some space and try again.',
    action: 'Manage Storage',
  },
};

// Error type detector
export function getErrorType(error: Error | string): keyof typeof ErrorMessages {
  const message = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }

  if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
    return 'authentication';
  }

  if (message.includes('not found') || message.includes('404')) {
    return 'notFound';
  }

  if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
    return 'permission';
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }

  if (message.includes('playback') || message.includes('video') || message.includes('audio')) {
    return 'playback';
  }

  if (message.includes('storage') || message.includes('quota')) {
    return 'storage';
  }

  return 'server';
}

// Error recovery strategies
export const ErrorRecovery = {
  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },

  /**
   * Fallback chain - try multiple strategies
   */
  async fallbackChain<T>(strategies: Array<() => Promise<T>>): Promise<T> {
    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All fallback strategies failed');
  },

  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker<T>(
    fn: () => Promise<T>,
    threshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async (): Promise<T> => {
      // Reset if enough time has passed
      if (isOpen && Date.now() - lastFailureTime >= resetTimeout) {
        isOpen = false;
        failures = 0;
      }

      if (isOpen) {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await fn();
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= threshold) {
          isOpen = true;
        }

        throw error;
      }
    };
  },
};

// React Error Boundary component is available in: ../components/ErrorBoundary.tsx
