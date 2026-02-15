import type { ServerConfig, FeatureFlags } from '@/types/config';
import { getEnvironmentConfig } from './environment';

/**
 * Server configuration cache
 * Stores fetched config to avoid repeated requests
 */
let cachedConfig: ServerConfig | null = null;
let configFetchPromise: Promise<ServerConfig> | null = null;

/**
 * Fetch server configuration from backend
 * Includes tenant-aware feature flags and branding
 */
export async function fetchServerConfig(backendUrl?: string): Promise<ServerConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Return existing fetch promise if in progress
  if (configFetchPromise) {
    return configFetchPromise;
  }

  const envConfig = getEnvironmentConfig();
  const baseUrl = backendUrl || envConfig.backendUrl || discoverBackendUrl();

  configFetchPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include credentials for tenant-aware config
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch server config: ${response.statusText}`);
      }

      const config: ServerConfig = await response.json();
      cachedConfig = config;
      return config;
    } catch (error) {
      console.warn('Failed to fetch server config, using defaults:', error);
      // Fall back to build-time defaults
      return getDefaultServerConfig();
    } finally {
      configFetchPromise = null;
    }
  })();

  return configFetchPromise;
}

/**
 * Get default server configuration (fallback when fetch fails)
 */
function getDefaultServerConfig(): ServerConfig {
  const envConfig = getEnvironmentConfig();

  return {
    name: 'nself-tv',
    version: '0.9.1',
    mode: envConfig.mode,
    branding: {
      appName: 'nTV',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#ec4899',
      logoUrl: null,
      faviconUrl: null,
    },
    features: envConfig.defaultFeatures,
    endpoints: {
      graphql: envConfig.backendUrl
        ? `${envConfig.backendUrl}/v1/graphql`
        : 'http://localhost:8080/v1/graphql',
      ws: envConfig.backendUrl
        ? `${envConfig.backendUrl.replace('http', 'ws')}/v1/graphql`
        : 'ws://localhost:8080/v1/graphql',
      auth: envConfig.backendUrl
        ? `${envConfig.backendUrl}/auth`
        : 'http://localhost:4000',
      media: envConfig.backendUrl
        ? `${envConfig.backendUrl}/media`
        : 'http://localhost:9000',
      search: envConfig.backendUrl
        ? `${envConfig.backendUrl}/search`
        : 'http://localhost:7700',
    },
  };
}

/**
 * Discover backend URL from environment or defaults
 */
function discoverBackendUrl(): string {
  // In production, use relative URLs (same origin)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }

  // In development, use localhost
  return 'http://localhost:8080';
}

/**
 * Clear cached server config (useful for testing or tenant switching)
 */
export function clearServerConfigCache(): void {
  cachedConfig = null;
  configFetchPromise = null;
}

/**
 * Get feature flags from server config
 */
export async function getServerFeatureFlags(backendUrl?: string): Promise<FeatureFlags> {
  const config = await fetchServerConfig(backendUrl);
  return config.features;
}
