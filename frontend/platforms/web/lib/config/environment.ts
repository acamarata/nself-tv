import type { EnvironmentConfig, FeatureFlags, DeploymentMode } from '@/types/config';

/**
 * Build-time environment configuration
 * Read from process.env (NEXT_PUBLIC_* variables accessible on client)
 */

const DEFAULT_FEATURES: FeatureFlags = {
  vod: true,
  liveTV: true,
  sports: true,
  podcasts: true,
  games: true,
  dvr: true,
  downloads: true,
  watchParty: true,
};

/**
 * Get environment configuration from build-time variables
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const mode = (process.env.NEXT_PUBLIC_NTV_MODE || 'standalone') as DeploymentMode;
  const backendUrl = process.env.NEXT_PUBLIC_NTV_BACKEND_URL || null;

  // Parse feature flags from environment (comma-separated)
  const enabledFeatures = process.env.NEXT_PUBLIC_NTV_FEATURES
    ? process.env.NEXT_PUBLIC_NTV_FEATURES.split(',').map((f) => f.trim())
    : null;

  const defaultFeatures = enabledFeatures
    ? Object.keys(DEFAULT_FEATURES).reduce((acc, key) => {
        acc[key as keyof FeatureFlags] = enabledFeatures.includes(key);
        return acc;
      }, {} as FeatureFlags)
    : DEFAULT_FEATURES;

  return {
    backendUrl,
    mode,
    defaultFeatures,
  };
}

/**
 * Check if running in standalone mode (own backend)
 */
export function isStandaloneMode(): boolean {
  return getEnvironmentConfig().mode === 'standalone';
}

/**
 * Check if running in monorepo mode (shared backend)
 */
export function isMonorepoMode(): boolean {
  return getEnvironmentConfig().mode === 'monorepo';
}

/**
 * Get backend URL from environment or return null to use discovery
 */
export function getBackendUrl(): string | null {
  return getEnvironmentConfig().backendUrl;
}
