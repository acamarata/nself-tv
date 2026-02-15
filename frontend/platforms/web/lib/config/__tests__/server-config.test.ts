import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchServerConfig,
  clearServerConfigCache,
  getServerFeatureFlags,
} from '../server-config';

// Mock fetch
global.fetch = vi.fn();

describe('Server Configuration', () => {
  beforeEach(() => {
    clearServerConfigCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchServerConfig', () => {
    it('should fetch config from server successfully', async () => {
      const mockConfig = {
        name: 'nself-tv',
        version: '0.9.1',
        mode: 'standalone' as const,
        branding: {
          appName: 'nTV',
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          accentColor: '#ec4899',
          logoUrl: null,
          faviconUrl: null,
        },
        features: {
          vod: true,
          liveTV: true,
          sports: false,
          podcasts: true,
          games: true,
          dvr: false,
          downloads: true,
          watchParty: false,
        },
        endpoints: {
          graphql: 'http://localhost:8080/v1/graphql',
          ws: 'ws://localhost:8080/v1/graphql',
          auth: 'http://localhost:4000',
          media: 'http://localhost:9000',
          search: 'http://localhost:7700',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const config = await fetchServerConfig();

      expect(config).toEqual(mockConfig);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/config'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
    });

    it('should cache config after first fetch', async () => {
      const mockConfig = {
        name: 'nself-tv',
        version: '0.9.1',
        mode: 'standalone' as const,
        branding: {
          appName: 'nTV',
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          accentColor: '#ec4899',
          logoUrl: null,
          faviconUrl: null,
        },
        features: {
          vod: true,
          liveTV: false,
          sports: false,
          podcasts: false,
          games: false,
          dvr: false,
          downloads: false,
          watchParty: false,
        },
        endpoints: {
          graphql: 'http://localhost:8080/v1/graphql',
          ws: 'ws://localhost:8080/v1/graphql',
          auth: 'http://localhost:4000',
          media: 'http://localhost:9000',
          search: 'http://localhost:7700',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      // First fetch
      const config1 = await fetchServerConfig();
      // Second fetch (should use cache)
      const config2 = await fetchServerConfig();

      expect(config1).toEqual(config2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return default config when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const config = await fetchServerConfig();

      expect(config).toMatchObject({
        name: 'nself-tv',
        version: '0.9.1',
        mode: 'standalone',
      });
      expect(config.features.vod).toBe(true);
    });

    it('should use provided backend URL', async () => {
      const customUrl = 'https://custom.example.com';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'nself-tv',
          version: '0.9.1',
          mode: 'standalone',
          branding: {
            appName: 'nTV',
            primaryColor: '#6366f1',
            secondaryColor: '#8b5cf6',
            accentColor: '#ec4899',
            logoUrl: null,
            faviconUrl: null,
          },
          features: {
            vod: true,
            liveTV: false,
            sports: false,
            podcasts: false,
            games: false,
            dvr: false,
            downloads: false,
            watchParty: false,
          },
          endpoints: {
            graphql: 'http://localhost:8080/v1/graphql',
            ws: 'ws://localhost:8080/v1/graphql',
            auth: 'http://localhost:4000',
            media: 'http://localhost:9000',
            search: 'http://localhost:7700',
          },
        }),
      });

      await fetchServerConfig(customUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        `${customUrl}/api/config`,
        expect.any(Object),
      );
    });
  });

  describe('clearServerConfigCache', () => {
    it('should clear cached config', async () => {
      const mockConfig = {
        name: 'nself-tv',
        version: '0.9.1',
        mode: 'standalone' as const,
        branding: {
          appName: 'nTV',
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          accentColor: '#ec4899',
          logoUrl: null,
          faviconUrl: null,
        },
        features: {
          vod: true,
          liveTV: false,
          sports: false,
          podcasts: false,
          games: false,
          dvr: false,
          downloads: false,
          watchParty: false,
        },
        endpoints: {
          graphql: 'http://localhost:8080/v1/graphql',
          ws: 'ws://localhost:8080/v1/graphql',
          auth: 'http://localhost:4000',
          media: 'http://localhost:9000',
          search: 'http://localhost:7700',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      // Fetch and cache
      await fetchServerConfig();

      // Clear cache
      clearServerConfigCache();

      // Fetch again (should make new request)
      await fetchServerConfig();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getServerFeatureFlags', () => {
    it('should extract feature flags from server config', async () => {
      const mockConfig = {
        name: 'nself-tv',
        version: '0.9.1',
        mode: 'standalone' as const,
        branding: {
          appName: 'nTV',
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          accentColor: '#ec4899',
          logoUrl: null,
          faviconUrl: null,
        },
        features: {
          vod: true,
          liveTV: true,
          sports: false,
          podcasts: true,
          games: false,
          dvr: false,
          downloads: true,
          watchParty: true,
        },
        endpoints: {
          graphql: 'http://localhost:8080/v1/graphql',
          ws: 'ws://localhost:8080/v1/graphql',
          auth: 'http://localhost:4000',
          media: 'http://localhost:9000',
          search: 'http://localhost:7700',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const flags = await getServerFeatureFlags();

      expect(flags).toEqual({
        vod: true,
        liveTV: true,
        sports: false,
        podcasts: true,
        games: false,
        dvr: false,
        downloads: true,
        watchParty: true,
      });
    });
  });
});
