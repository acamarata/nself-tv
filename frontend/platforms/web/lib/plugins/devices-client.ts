/**
 * Device management plugin client.
 * Communicates with the nSelf devices plugin (port 3603).
 */

import type { PluginError } from './types';

// -- Types --

export type DeviceStatus = 'online' | 'offline' | 'idle' | 'playing' | 'updating' | 'error';

export type DeviceType =
  | 'tv'
  | 'mobile'
  | 'desktop'
  | 'tablet'
  | 'streaming_stick'
  | 'game_console'
  | 'speaker'
  | 'other';

export interface DeviceTelemetry {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  temperature?: number;
  networkRxBytes?: number;
  networkTxBytes?: number;
}

export interface Device {
  id: string;
  familyId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  publicKey: string;
  lastSeen: string;
  telemetry: DeviceTelemetry | null;
  firmware: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BootstrapToken {
  token: string;
  expiresAt: string;
}

export interface DeviceEnrollParams {
  deviceId: string;
  publicKey: string;
  token: string;
  info: {
    name: string;
    type: DeviceType;
    firmware?: string;
  };
}

export interface DeviceCommand {
  type: string;
  payload: Record<string, unknown>;
}

// -- Client --

const DEFAULT_BASE_URL = 'http://localhost:3603';

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

export function createBootstrapToken(
  familyId: string,
  type: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<BootstrapToken> {
  return request<BootstrapToken>(baseUrl, '/api/v1/devices/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ familyId, type }),
  });
}

export function enrollDevice(
  params: DeviceEnrollParams,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Device> {
  return request<Device>(baseUrl, '/api/v1/devices/enroll', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function sendHeartbeat(
  deviceId: string,
  payload: object,
  signature: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/devices/${deviceId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ payload, signature }),
  });
}

export function sendCommand(
  deviceId: string,
  command: DeviceCommand,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/devices/${deviceId}/command`, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

export function listDevices(
  familyId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Device[]> {
  return request<Device[]>(baseUrl, `/api/v1/devices?familyId=${encodeURIComponent(familyId)}`, {
    method: 'GET',
  });
}

export function getDevice(
  deviceId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Device> {
  return request<Device>(baseUrl, `/api/v1/devices/${deviceId}`, {
    method: 'GET',
  });
}

export function revokeDevice(
  deviceId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<void> {
  return request<void>(baseUrl, `/api/v1/devices/${deviceId}`, {
    method: 'DELETE',
  });
}
