import type { ServerConfig, ServerEndpoints } from '@/types/config';

const DEFAULT_ENDPOINTS: ServerEndpoints = {
  graphql: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1/graphql',
  ws: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/v1/graphql',
  auth: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000',
  media: process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:9000',
  search: process.env.NEXT_PUBLIC_SEARCH_URL || 'http://localhost:7700',
};

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export async function testConnection(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${normalizeUrl(baseUrl)}/api/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchServerConfig(baseUrl: string): Promise<ServerConfig> {
  const url = normalizeUrl(baseUrl);
  const res = await fetch(`${url}/api/v1/config`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch config: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function getDefaultConfig(): ServerConfig {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'nself-tv',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.3.0',
    branding: {
      appName: 'nself-tv',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#f59e0b',
      logoUrl: null,
      faviconUrl: null,
    },
    features: {
      vod: process.env.NEXT_PUBLIC_ENABLE_VOD !== 'false',
      liveTV: process.env.NEXT_PUBLIC_ENABLE_LIVE_TV === 'true',
      sports: process.env.NEXT_PUBLIC_ENABLE_SPORTS === 'true',
      podcasts: process.env.NEXT_PUBLIC_ENABLE_PODCASTS === 'true',
      games: process.env.NEXT_PUBLIC_ENABLE_GAMES === 'true',
      dvr: false,
      downloads: false,
      watchParty: false,
    },
    endpoints: DEFAULT_ENDPOINTS,
  };
}
