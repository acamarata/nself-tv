import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredConfig, storeConfig, clearConfig, getStoredServerUrl, storeServerUrl } from '@/lib/api/storage';
import type { ServerConfig } from '@/types/config';

const mockConfig: ServerConfig = {
  name: 'test',
  version: '1.0.0',
  branding: {
    appName: 'test-app',
    primaryColor: '#ff0000',
    secondaryColor: '#00ff00',
    accentColor: '#0000ff',
    logoUrl: null,
    faviconUrl: null,
  },
  features: {
    vod: true,
    liveTV: false,
    sports: false,
    podcasts: true,
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

describe('config storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no config stored', () => {
    expect(getStoredConfig()).toBeNull();
  });

  it('stores and retrieves config', () => {
    storeConfig(mockConfig);
    const retrieved = getStoredConfig();
    expect(retrieved).toEqual(mockConfig);
  });

  it('clears config and server URL', () => {
    storeConfig(mockConfig);
    storeServerUrl('http://localhost:8080');
    clearConfig();
    expect(getStoredConfig()).toBeNull();
    expect(getStoredServerUrl()).toBeNull();
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('ntv_server_config', 'not-json');
    expect(getStoredConfig()).toBeNull();
  });
});

describe('server URL storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no URL stored', () => {
    expect(getStoredServerUrl()).toBeNull();
  });

  it('stores and retrieves server URL', () => {
    storeServerUrl('http://localhost:8080');
    expect(getStoredServerUrl()).toBe('http://localhost:8080');
  });
});
