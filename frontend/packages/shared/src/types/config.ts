export interface BackendConfig {
  graphqlUrl: string;
  authUrl: string;
  storageUrl: string;
  wsUrl?: string;
}

export interface AppConfig extends BackendConfig {
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
}

export interface FeatureFlags {
  vod: boolean;
  liveTv: boolean;
  sports: boolean;
  podcasts: boolean;
  games: boolean;
  contentAcquisition: boolean;
}
