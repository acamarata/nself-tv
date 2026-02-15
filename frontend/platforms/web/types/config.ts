export type DeploymentMode = 'standalone' | 'monorepo';

export interface EnvironmentConfig {
  /** Override backend URL (skips discovery) */
  backendUrl: string | null;
  /** Deployment mode: standalone (own backend) or monorepo (shared backend) */
  mode: DeploymentMode;
  /** Build-time feature flag defaults */
  defaultFeatures: FeatureFlags;
}

export interface ServerConfig {
  name: string;
  version: string;
  mode: DeploymentMode;
  branding: ServerBranding;
  features: FeatureFlags;
  endpoints: ServerEndpoints;
}

export interface ServerBranding {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface FeatureFlags {
  vod: boolean;
  liveTV: boolean;
  sports: boolean;
  podcasts: boolean;
  games: boolean;
  dvr: boolean;
  downloads: boolean;
  watchParty: boolean;
}

export interface ServerEndpoints {
  graphql: string;
  ws: string;
  auth: string;
  media: string;
  search: string;
}

export type ColorScheme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  colorScheme: ColorScheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
