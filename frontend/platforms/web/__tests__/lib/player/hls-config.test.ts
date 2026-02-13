import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHlsConstructor, mockIsSupported } = vi.hoisted(() => {
  return {
    mockHlsConstructor: vi.fn(),
    mockIsSupported: vi.fn(),
  };
});

vi.mock('hls.js', () => {
  const HlsMock = function (
    this: Record<string, unknown>,
    config: Record<string, unknown>,
  ) {
    mockHlsConstructor(config);
    this.config = config;
  } as unknown as {
    new (config: Record<string, unknown>): Record<string, unknown>;
    isSupported: () => boolean;
    DefaultConfig: Record<string, unknown>;
  };

  HlsMock.isSupported = mockIsSupported;
  HlsMock.DefaultConfig = {};

  return { default: HlsMock };
});

import {
  createHlsInstance,
  isHlsSupported,
  isNativeHlsSupported,
} from '@/lib/player/hls-config';

describe('createHlsInstance', () => {
  beforeEach(() => {
    mockHlsConstructor.mockClear();
  });

  it('creates an HLS instance with default config', () => {
    createHlsInstance();

    expect(mockHlsConstructor).toHaveBeenCalledTimes(1);
    const config = mockHlsConstructor.mock.calls[0][0];
    expect(config.debug).toBe(false);
    expect(config.enableWorker).toBe(true);
    expect(config.lowLatencyMode).toBe(false);
    expect(config.backBufferLength).toBe(90);
    expect(config.maxBufferLength).toBe(60);
    expect(config.maxMaxBufferLength).toBe(120);
    expect(config.manifestLoadingTimeOut).toBe(10000);
    expect(config.manifestLoadingMaxRetry).toBe(3);
    expect(config.levelLoadingTimeOut).toBe(10000);
    expect(config.levelLoadingMaxRetry).toBe(4);
    expect(config.fragLoadingTimeOut).toBe(20000);
    expect(config.fragLoadingMaxRetry).toBe(6);
  });

  it('merges overrides into the config', () => {
    createHlsInstance({ debug: true, maxBufferLength: 120 });

    const config = mockHlsConstructor.mock.calls[0][0];
    expect(config.debug).toBe(true);
    expect(config.maxBufferLength).toBe(120);
    // Non-overridden defaults should remain
    expect(config.enableWorker).toBe(true);
    expect(config.fragLoadingMaxRetry).toBe(6);
  });

  it('allows overriding all defaults', () => {
    createHlsInstance({
      enableWorker: false,
      lowLatencyMode: true,
      backBufferLength: 30,
    });

    const config = mockHlsConstructor.mock.calls[0][0];
    expect(config.enableWorker).toBe(false);
    expect(config.lowLatencyMode).toBe(true);
    expect(config.backBufferLength).toBe(30);
  });

  it('returns an Hls instance', () => {
    const instance = createHlsInstance();
    expect(instance).toBeDefined();
  });

  it('accepts empty overrides object', () => {
    createHlsInstance({});

    const config = mockHlsConstructor.mock.calls[0][0];
    expect(config.debug).toBe(false);
    expect(config.enableWorker).toBe(true);
  });
});

describe('isHlsSupported', () => {
  beforeEach(() => {
    mockIsSupported.mockReset();
  });

  it('returns true when Hls.isSupported() returns true', () => {
    mockIsSupported.mockReturnValue(true);
    expect(isHlsSupported()).toBe(true);
  });

  it('returns false when Hls.isSupported() returns false', () => {
    mockIsSupported.mockReturnValue(false);
    expect(isHlsSupported()).toBe(false);
  });
});

describe('isNativeHlsSupported', () => {
  it('returns true when video element can play HLS', () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') {
        const el = originalCreateElement('video');
        vi.spyOn(el, 'canPlayType').mockReturnValue('maybe');
        return el;
      }
      return originalCreateElement(tag);
    });

    expect(isNativeHlsSupported()).toBe(true);
    vi.restoreAllMocks();
  });

  it('returns false when video element cannot play HLS', () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') {
        const el = originalCreateElement('video');
        vi.spyOn(el, 'canPlayType').mockReturnValue('');
        return el;
      }
      return originalCreateElement(tag);
    });

    expect(isNativeHlsSupported()).toBe(false);
    vi.restoreAllMocks();
  });
});
