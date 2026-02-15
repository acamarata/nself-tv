/**
 * Structured JSON Logger
 *
 * Provides consistent logging across all Node.js services with:
 * - JSON format in production
 * - Pretty format in development
 * - Request ID tracking
 * - Timestamp, level, service metadata
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor(serviceName) {
    this.serviceName = serviceName;

    // Evaluate environment at construction time, not module load time
    const ENV = process.env.NODE_ENV || 'development';
    this.isProduction = ENV === 'production';
    const MIN_LEVEL = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');
    // Use proper undefined check since LOG_LEVELS['debug'] is 0 (falsy)
    this.minLevel = MIN_LEVEL in LOG_LEVELS ? LOG_LEVELS[MIN_LEVEL] : LOG_LEVELS.info;
  }

  /**
   * Format log entry as JSON or pretty string
   */
  _format(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    if (this.isProduction) {
      // JSON format for production (Promtail parsing)
      return JSON.stringify(entry);
    } else {
      // Pretty format for development
      const timestamp = entry.timestamp.substring(11, 23); // HH:mm:ss.SSS
      const levelColor = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
      }[level] || '';
      const reset = '\x1b[0m';
      const contextStr = Object.keys(context).length > 0
        ? ` ${JSON.stringify(context)}`
        : '';

      return `${timestamp} ${levelColor}[${level.toUpperCase()}]${reset} [${this.serviceName}] ${message}${contextStr}`;
    }
  }

  /**
   * Write log entry to stdout/stderr
   */
  _write(level, message, context) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return; // Below minimum level, skip
    }

    const formatted = this._format(level, message, context);

    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Debug level logging
   */
  debug(message, context = {}) {
    this._write('debug', message, context);
  }

  /**
   * Info level logging
   */
  info(message, context = {}) {
    this._write('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message, context = {}) {
    this._write('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message, context = {}) {
    // If context is an Error object, extract stack trace
    if (context instanceof Error) {
      context = {
        error: context.message,
        stack: context.stack,
        name: context.name,
      };
    } else if (context.error instanceof Error) {
      context = {
        ...context,
        error: context.error.message,
        stack: context.error.stack,
        name: context.error.name,
      };
    }

    this._write('error', message, context);
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext) {
    const childLogger = new Logger(this.serviceName);
    childLogger.minLevel = this.minLevel;
    childLogger.defaultContext = {
      ...(this.defaultContext || {}),
      ...additionalContext,
    };

    // Override _write to include default context
    const originalWrite = childLogger._write.bind(childLogger);
    childLogger._write = (level, message, context) => {
      originalWrite(level, message, {
        ...childLogger.defaultContext,
        ...context,
      });
    };

    return childLogger;
  }
}

/**
 * Create logger instance for a service
 */
function createLogger(serviceName) {
  return new Logger(serviceName);
}

/**
 * Express middleware to add request ID to all logs
 */
function requestIdMiddleware(logger) {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.requestId = requestId;
    req.logger = logger.child({ requestId });

    // Add request ID to response headers
    res.setHeader('X-Request-Id', requestId);

    // Log incoming request
    req.logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    });

    // Log response on finish
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      req.logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

module.exports = {
  createLogger,
  requestIdMiddleware,
  generateRequestId,
};
