import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBootstrapToken,
  enrollDevice,
  sendHeartbeat,
  sendCommand,
  listDevices,
  getDevice,
} from '@/lib/plugins/devices-client';
import type {
  Device,
  BootstrapToken,
  DeviceEnrollParams,
} from '@/lib/plugins/devices-client';

const BASE = 'http://localhost:3603';

const mockDevice: Device = {
  id: 'dev-001',
  familyId: 'fam-001',
  name: 'Living Room TV',
  type: 'tv',
  status: 'online',
  publicKey: 'pk-abc123',
  lastSeen: '2026-02-13T12:00:00Z',
  telemetry: {
    cpuPercent: 12,
    memoryPercent: 45,
    diskPercent: 60,
    uptimeSeconds: 86400,
  },
  firmware: '1.2.0',
  ipAddress: '192.168.1.50',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-13T12:00:00Z',
};

const mockToken: BootstrapToken = {
  token: 'tok-xyz789',
  expiresAt: '2026-02-14T00:00:00Z',
};

describe('devices-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBootstrapToken', () => {
    it('sends POST with familyId and type', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockToken),
      });

      const result = await createBootstrapToken('fam-001', 'tv');

      expect(result).toEqual(mockToken);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices/bootstrap`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ familyId: 'fam-001', type: 'tv' }),
        }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockToken),
      });

      await createBootstrapToken('fam-001', 'tv', 'http://custom:9999');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:9999/api/v1/devices/bootstrap',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'not_found', message: 'Family not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(createBootstrapToken('bad', 'tv')).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(createBootstrapToken('fam-001', 'tv')).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  describe('enrollDevice', () => {
    it('sends POST with enrollment params and returns Device', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDevice),
      });

      const params: DeviceEnrollParams = {
        deviceId: 'dev-001',
        publicKey: 'pk-abc123',
        token: 'tok-xyz789',
        info: { name: 'Living Room TV', type: 'tv', firmware: '1.2.0' },
      };

      const result = await enrollDevice(params);

      expect(result).toEqual(mockDevice);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices/enroll`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(params),
        }),
      );
    });
  });

  describe('sendHeartbeat', () => {
    it('sends POST to heartbeat endpoint and returns void', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const payload = { cpuPercent: 10, memoryPercent: 40 };
      const result = await sendHeartbeat('dev-001', payload, 'sig-abc');

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices/dev-001/heartbeat`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ payload, signature: 'sig-abc' }),
        }),
      );
    });
  });

  describe('sendCommand', () => {
    it('sends POST with command type and payload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const command = { type: 'reboot', payload: { delay: 5 } };
      const result = await sendCommand('dev-001', command);

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices/dev-001/command`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(command),
        }),
      );
    });
  });

  describe('listDevices', () => {
    it('sends GET with familyId query param and returns Device[]', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockDevice]),
      });

      const result = await listDevices('fam-001');

      expect(result).toEqual([mockDevice]);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices?familyId=fam-001`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes familyId with special characters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await listDevices('fam/001&x=1');

      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices?familyId=${encodeURIComponent('fam/001&x=1')}`,
        expect.any(Object),
      );
    });
  });

  describe('getDevice', () => {
    it('sends GET and returns a single Device', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDevice),
      });

      const result = await getDevice('dev-001');

      expect(result).toEqual(mockDevice);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/devices/dev-001`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws on 404', async () => {
      const errorBody = { error: 'not_found', message: 'Device not found', statusCode: 404 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getDevice('nonexistent')).rejects.toEqual(errorBody);
    });
  });
});
