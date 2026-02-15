const { createLogger, requestIdMiddleware, generateRequestId } = require('../logger');

describe('Logger', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create logger with service name', () => {
      const logger = createLogger('test-service');
      expect(logger).toBeDefined();
      expect(logger.serviceName).toBe('test-service');
    });

    it('should log debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'debug';

      // Verify env is set
      expect(process.env.NODE_ENV).toBe('development');
      expect(process.env.LOG_LEVEL).toBe('debug');

      const logger = createLogger('test');

      // Debug: verify logger configuration
      expect(logger.isProduction).toBe(false);
      expect(logger.minLevel).toBe(0); // debug level

      logger.debug('Debug message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('test');
      expect(output).toContain('Debug message');
    });

    it('should log info messages', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      logger.info('Info message', { port: 3000 });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[INFO]');
      expect(output).toContain('Info message');
      expect(output).toContain('"port":3000');
    });

    it('should log warn messages', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      logger.warn('Warning message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[WARN]');
      expect(output).toContain('Warning message');
    });

    it('should log error messages to stderr', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      logger.error('Error message', { code: 500 });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('[ERROR]');
      expect(output).toContain('Error message');
    });

    it('should extract error details from Error objects', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      const error = new Error('Test error');
      logger.error('Request failed', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Test error');
      expect(output).toContain('stack');
    });

    it('should extract error from context.error', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      const error = new Error('Context error');
      logger.error('Operation failed', { error, userId: '123' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Context error');
      expect(output).toContain('stack');
    });

    it('should format logs as JSON in production', () => {
      process.env.NODE_ENV = 'production';

      const logger = createLogger('test');
      logger.info('Production message', { env: 'prod' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe('info');
      expect(parsed.service).toBe('test');
      expect(parsed.message).toBe('Production message');
      expect(parsed.env).toBe('prod');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should respect minimum log level', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';

      const logger = createLogger('test');
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      // Only warn should be logged
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('warn');
    });

    it('should create child logger with additional context', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      const childLogger = logger.child({ requestId: '123' });

      childLogger.info('Child message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('requestId');
      expect(output).toContain('123');
    });

    it('should merge context in child logger', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      const childLogger = logger.child({ userId: 'abc' });

      childLogger.info('Message', { action: 'login' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('userId');
      expect(output).toContain('abc');
      expect(output).toContain('action');
      expect(output).toContain('login');
    });

    it('should default to development when NODE_ENV not set', () => {
      // Don't set NODE_ENV
      const logger = createLogger('test');

      // Should be in development mode (not production)
      expect(logger.isProduction).toBe(false);
    });

    it('should default to info level for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid-level';

      const logger = createLogger('test');

      // Should fallback to info level (1)
      expect(logger.minLevel).toBe(1);
    });

    it('should log without context', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      logger.info('Message without context');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Message without context');
      // Should not have JSON context at end
      expect(output).not.toContain('{');
    });

    it('should handle error object with no stack when logging', () => {
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');
      const errorNoStack = { message: 'Error without stack' };
      logger.error('Error occurred', errorNoStack);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Error occurred');
    });
  });

  describe('requestIdMiddleware', () => {
    it('should add request ID to request', () => {
      const logger = createLogger('test');
      const middleware = requestIdMiddleware(logger);

      const req = {
        headers: {},
        method: 'GET',
        url: '/test',
      };
      const res = {
        setHeader: jest.fn(),
        on: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(req.logger).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing request ID from headers', () => {
      const logger = createLogger('test');
      const middleware = requestIdMiddleware(logger);

      const existingId = 'existing-123';
      const req = {
        headers: { 'x-request-id': existingId },
        method: 'GET',
        url: '/test',
      };
      const res = {
        setHeader: jest.fn(),
        on: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.requestId).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId);
    });

    it('should log incoming request', () => {
      process.env.NODE_ENV = 'development';
      const logger = createLogger('test');
      const middleware = requestIdMiddleware(logger);

      const req = {
        headers: { 'user-agent': 'test-agent' },
        method: 'POST',
        url: '/api/data',
      };
      const res = {
        setHeader: jest.fn(),
        on: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Incoming request');
      expect(output).toContain('POST');
      expect(output).toContain('/api/data');
    });

    it('should log response on finish', () => {
      process.env.NODE_ENV = 'development';
      const logger = createLogger('test');
      const middleware = requestIdMiddleware(logger);

      let finishCallback;
      const req = {
        headers: {},
        method: 'GET',
        url: '/test',
      };
      const res = {
        setHeader: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            finishCallback = callback;
          }
        }),
        statusCode: 200,
      };
      const next = jest.fn();

      middleware(req, res, next);
      consoleLogSpy.mockClear();

      // Simulate response finish
      finishCallback();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Request completed');
      expect(output).toContain('200');
      expect(output).toContain('duration');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate request ID with timestamp and random string', () => {
      const id = generateRequestId();
      const parts = id.split('-');

      expect(parts).toHaveLength(2);
      expect(parseInt(parts[0])).toBeGreaterThan(0); // Timestamp
      expect(parts[1]).toMatch(/^[a-z0-9]+$/); // Random string
    });
  });
});
