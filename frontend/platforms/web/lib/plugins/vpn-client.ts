/**
 * VPN plugin client.
 * Communicates with the nSelf VPN plugin (port 3200).
 */

import type { PluginError } from './types';
import type { VPNStatus } from '@/types/acquisition';

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3200';

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

export function getVPNStatus(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<VPNStatus> {
  return request<VPNStatus>(baseUrl, '/api/v1/vpn/status');
}

export function connectVPN(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<VPNStatus> {
  return request<VPNStatus>(baseUrl, '/api/v1/vpn/connect', {
    method: 'POST',
  });
}

export function disconnectVPN(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, '/api/v1/vpn/disconnect', {
    method: 'POST',
  });
}

export function getVPNHealth(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<{ healthy: boolean; leakTest: boolean }> {
  return request<{ healthy: boolean; leakTest: boolean }>(baseUrl, '/api/v1/vpn/health');
}
