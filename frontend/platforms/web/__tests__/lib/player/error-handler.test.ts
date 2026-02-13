import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerErrorHandler, ErrorSeverity } from '@/lib/player/error-handler';
import type { PlayerError } from '@/lib/player/error-handler';

describe('PlayerErrorHandler', () => {
  let handler: PlayerErrorHandler;

  beforeEach(() => {
    handler = new PlayerErrorHandler();
  });

  describe('classifyError', () => {
    it('classifies manifestLoadError as FATAL and retryable', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
      });

      expect(error.severity).toBe(ErrorSeverity.FATAL);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Failed to load video');
      expect(error.type).toBe('networkError');
      expect(error.details).toEqual({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
      });
    });

    it('classifies fragLoadError as RECOVERABLE and retryable', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      expect(error.severity).toBe(ErrorSeverity.RECOVERABLE);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Video segment failed to load');
      expect(error.type).toBe('networkError');
    });

    it('classifies bufferStalledError as RECOVERABLE and retryable', () => {
      const error = handler.classifyError({
        type: 'mediaError',
        details: 'bufferStalledError',
        fatal: false,
      });

      expect(error.severity).toBe(ErrorSeverity.RECOVERABLE);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Playback stalled');
      expect(error.type).toBe('mediaError');
    });

    it('classifies bufferAppendError as FATAL and not retryable', () => {
      const error = handler.classifyError({
        type: 'mediaError',
        details: 'bufferAppendError',
        fatal: true,
      });

      expect(error.severity).toBe(ErrorSeverity.FATAL);
      expect(error.retryable).toBe(false);
      expect(error.message).toBe('Media format not supported');
      expect(error.type).toBe('mediaError');
    });

    it('classifies muxError as FATAL and not retryable', () => {
      const error = handler.classifyError({
        type: 'muxError',
        details: 'someMuxDetail',
        fatal: true,
      });

      expect(error.severity).toBe(ErrorSeverity.FATAL);
      expect(error.retryable).toBe(false);
      expect(error.message).toBe('Media format error');
      expect(error.type).toBe('muxError');
    });

    it('classifies unknown fatal error as FATAL and retryable', () => {
      const error = handler.classifyError({
        type: 'unknownType',
        details: 'unknownDetail',
        fatal: true,
      });

      expect(error.severity).toBe(ErrorSeverity.FATAL);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('An unexpected error occurred');
    });

    it('classifies unknown non-fatal error as RECOVERABLE and retryable', () => {
      const error = handler.classifyError({
        type: 'unknownType',
        details: 'unknownDetail',
        fatal: false,
      });

      expect(error.severity).toBe(ErrorSeverity.RECOVERABLE);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('An unexpected error occurred');
    });

    it('preserves the original data in details', () => {
      const inputData = {
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
      };
      const error = handler.classifyError(inputData);
      expect(error.details).toEqual(inputData);
    });
  });

  describe('shouldRetry', () => {
    it('returns true when retryable and under max retries', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      expect(handler.shouldRetry(error)).toBe(true);
    });

    it('returns false when not retryable', () => {
      const error = handler.classifyError({
        type: 'mediaError',
        details: 'bufferAppendError',
        fatal: true,
      });

      expect(handler.shouldRetry(error)).toBe(false);
    });

    it('returns false when max retries exceeded', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      // Record 3 retries (default max)
      handler.recordRetry(error);
      handler.recordRetry(error);
      handler.recordRetry(error);

      expect(handler.shouldRetry(error)).toBe(false);
    });

    it('returns true when retries recorded but under max', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      handler.recordRetry(error);
      handler.recordRetry(error);

      expect(handler.shouldRetry(error)).toBe(true);
    });

    it('tracks retries per error type independently', () => {
      const fragError = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });
      const manifestError = handler.classifyError({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
      });

      // Exhaust retries for frag errors
      handler.recordRetry(fragError);
      handler.recordRetry(fragError);
      handler.recordRetry(fragError);

      expect(handler.shouldRetry(fragError)).toBe(false);
      expect(handler.shouldRetry(manifestError)).toBe(true);
    });
  });

  describe('recordRetry', () => {
    it('increments retry count', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      expect(handler.shouldRetry(error)).toBe(true);

      handler.recordRetry(error);
      handler.recordRetry(error);
      handler.recordRetry(error);

      expect(handler.shouldRetry(error)).toBe(false);
    });
  });

  describe('resetRetries', () => {
    it('clears all retry counts', () => {
      const error = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      handler.recordRetry(error);
      handler.recordRetry(error);
      handler.recordRetry(error);
      expect(handler.shouldRetry(error)).toBe(false);

      handler.resetRetries();
      expect(handler.shouldRetry(error)).toBe(true);
    });

    it('clears retries for all error types', () => {
      const fragError = handler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });
      const manifestError = handler.classifyError({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
      });

      handler.recordRetry(fragError);
      handler.recordRetry(fragError);
      handler.recordRetry(fragError);
      handler.recordRetry(manifestError);
      handler.recordRetry(manifestError);
      handler.recordRetry(manifestError);

      handler.resetRetries();

      expect(handler.shouldRetry(fragError)).toBe(true);
      expect(handler.shouldRetry(manifestError)).toBe(true);
    });
  });

  describe('custom maxRetries', () => {
    it('respects custom maxRetries in constructor', () => {
      const customHandler = new PlayerErrorHandler(5);

      const error = customHandler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      // Record 4 retries (under max of 5)
      customHandler.recordRetry(error);
      customHandler.recordRetry(error);
      customHandler.recordRetry(error);
      customHandler.recordRetry(error);
      expect(customHandler.shouldRetry(error)).toBe(true);

      // 5th retry
      customHandler.recordRetry(error);
      expect(customHandler.shouldRetry(error)).toBe(false);
    });

    it('handles maxRetries of 0', () => {
      const zeroHandler = new PlayerErrorHandler(0);

      const error = zeroHandler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      expect(zeroHandler.shouldRetry(error)).toBe(false);
    });

    it('handles maxRetries of 1', () => {
      const oneHandler = new PlayerErrorHandler(1);

      const error = oneHandler.classifyError({
        type: 'networkError',
        details: 'fragLoadError',
        fatal: false,
      });

      expect(oneHandler.shouldRetry(error)).toBe(true);
      oneHandler.recordRetry(error);
      expect(oneHandler.shouldRetry(error)).toBe(false);
    });
  });

  describe('ErrorSeverity enum', () => {
    it('has correct string values', () => {
      expect(ErrorSeverity.RECOVERABLE).toBe('recoverable');
      expect(ErrorSeverity.FATAL).toBe('fatal');
    });
  });
});
