import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getEnvironmentConfig,
  isStandaloneMode,
  isMonorepoMode,
  getBackendUrl,
} from '../environment';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe('getEnvironmentConfig', () => {
    it('should return default standalone mode when no env vars set', () => {
      delete process.env.NEXT_PUBLIC_NTV_MODE;
      delete process.env.NEXT_PUBLIC_NTV_BACKEND_URL;
      delete process.env.NEXT_PUBLIC_NTV_FEATURES;

      const config = getEnvironmentConfig();

      expect(config.mode).toBe('standalone');
      expect(config.backendUrl).toBeNull();
      expect(config.defaultFeatures).toEqual({
        vod: true,
        liveTV: true,
        sports: true,
        podcasts: true,
        games: true,
        dvr: true,
        downloads: true,
        watchParty: true,
      });
    });

    it('should read mode from NEXT_PUBLIC_NTV_MODE', () => {
      process.env.NEXT_PUBLIC_NTV_MODE = 'monorepo';

      const config = getEnvironmentConfig();

      expect(config.mode).toBe('monorepo');
    });

    it('should read backend URL from NEXT_PUBLIC_NTV_BACKEND_URL', () => {
      process.env.NEXT_PUBLIC_NTV_BACKEND_URL = 'https://api.example.com';

      const config = getEnvironmentConfig();

      expect(config.backendUrl).toBe('https://api.example.com');
    });

    it('should parse feature flags from NEXT_PUBLIC_NTV_FEATURES', () => {
      process.env.NEXT_PUBLIC_NTV_FEATURES = 'vod,liveTV,sports';

      const config = getEnvironmentConfig();

      expect(config.defaultFeatures).toEqual({
        vod: true,
        liveTV: true,
        sports: true,
        podcasts: false,
        games: false,
        dvr: false,
        downloads: false,
        watchParty: false,
      });
    });

    it('should handle whitespace in feature flags', () => {
      process.env.NEXT_PUBLIC_NTV_FEATURES = 'vod, liveTV , sports ';

      const config = getEnvironmentConfig();

      expect(config.defaultFeatures.vod).toBe(true);
      expect(config.defaultFeatures.liveTV).toBe(true);
      expect(config.defaultFeatures.sports).toBe(true);
    });

    it('should enable all features by default when NEXT_PUBLIC_NTV_FEATURES is not set', () => {
      delete process.env.NEXT_PUBLIC_NTV_FEATURES;

      const config = getEnvironmentConfig();

      expect(config.defaultFeatures).toEqual({
        vod: true,
        liveTV: true,
        sports: true,
        podcasts: true,
        games: true,
        dvr: true,
        downloads: true,
        watchParty: true,
      });
    });
  });

  describe('isStandaloneMode', () => {
    it('should return true when mode is standalone', () => {
      process.env.NEXT_PUBLIC_NTV_MODE = 'standalone';

      expect(isStandaloneMode()).toBe(true);
    });

    it('should return false when mode is monorepo', () => {
      process.env.NEXT_PUBLIC_NTV_MODE = 'monorepo';

      expect(isStandaloneMode()).toBe(false);
    });

    it('should return true by default', () => {
      delete process.env.NEXT_PUBLIC_NTV_MODE;

      expect(isStandaloneMode()).toBe(true);
    });
  });

  describe('isMonorepoMode', () => {
    it('should return true when mode is monorepo', () => {
      process.env.NEXT_PUBLIC_NTV_MODE = 'monorepo';

      expect(isMonorepoMode()).toBe(true);
    });

    it('should return false when mode is standalone', () => {
      process.env.NEXT_PUBLIC_NTV_MODE = 'standalone';

      expect(isMonorepoMode()).toBe(false);
    });

    it('should return false by default', () => {
      delete process.env.NEXT_PUBLIC_NTV_MODE;

      expect(isMonorepoMode()).toBe(false);
    });
  });

  describe('getBackendUrl', () => {
    it('should return backend URL from environment', () => {
      process.env.NEXT_PUBLIC_NTV_BACKEND_URL = 'https://api.example.com';

      expect(getBackendUrl()).toBe('https://api.example.com');
    });

    it('should return null when not set', () => {
      delete process.env.NEXT_PUBLIC_NTV_BACKEND_URL;

      expect(getBackendUrl()).toBeNull();
    });
  });
});
