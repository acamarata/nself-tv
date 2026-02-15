/**
 * Torrent manager plugin client.
 * Communicates with the nSelf torrent-manager plugin (port 3201).
 */

import type { PluginError } from './types';
import type {
  TorrentSource,
  SeedingStats,
  SeedingAggregate,
  BandwidthConfig,
} from '@/types/acquisition';

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3201';

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let body: PluginError;
    try {
      body = await res.json();
    } catch {
      body = { error: 'unknown', message: res.statusText, statusCode: res.status };
    }
    throw body;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function listSources(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TorrentSource[]> {
  return request<TorrentSource[]>(baseUrl, '/api/v1/torrent/sources');
}

export function getSeedingStats(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<SeedingStats[]> {
  return request<SeedingStats[]>(baseUrl, '/api/v1/torrent/seeding');
}

export function getSeedingAggregate(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<SeedingAggregate> {
  return request<SeedingAggregate>(baseUrl, '/api/v1/torrent/seeding/aggregate');
}

export function updateSeedingPolicy(
  torrentHash: string,
  policy: { seedRatioLimit?: number; seedTimeLimitMinutes?: number; isFavorite?: boolean },
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<SeedingStats> {
  return request<SeedingStats>(baseUrl, `/api/v1/torrent/seeding/${torrentHash}`, {
    method: 'PATCH',
    body: JSON.stringify(policy),
  });
}

export function getBandwidthConfig(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<BandwidthConfig> {
  return request<BandwidthConfig>(baseUrl, '/api/v1/torrent/bandwidth');
}

export function setBandwidthConfig(
  config: Partial<BandwidthConfig>,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<BandwidthConfig> {
  return request<BandwidthConfig>(baseUrl, '/api/v1/torrent/bandwidth', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}
