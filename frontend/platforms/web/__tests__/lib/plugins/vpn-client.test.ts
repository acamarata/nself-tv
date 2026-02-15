import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVPNStatus,
  connectVPN,
  disconnectVPN,
  getVPNHealth,
} from '@/lib/plugins/vpn-client';
import type { VPNStatus } from '@/types/acquisition';

const BASE = 'http://localhost:3200';

const mockConnected: VPNStatus = {
  connected: true,
  provider: 'Mullvad',
  server: 'se-mma-wg-001',
  protocol: 'WireGuard',
  ip: '185.213.154.72',
  country: 'SE',
  uptime: 3600,
  killSwitchActive: true,
};

const mockDisconnected: VPNStatus = {
  connected: false,
  provider: null,
  server: null,
  protocol: null,
  ip: null,
  country: null,
  uptime: null,
  killSwitchActive: false,
};

describe('vpn-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -- getVPNStatus --

  describe('getVPNStatus', () => {
    it('sends GET and returns VPNStatus when connected', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConnected),
      });

      const result = await getVPNStatus();

      expect(result).toEqual(mockConnected);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/vpn/status`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('returns disconnected status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDisconnected),
      });

      const result = await getVPNStatus();

      expect(result.connected).toBe(false);
      expect(result.provider).toBeNull();
      expect(result.ip).toBeNull();
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConnected),
      });

      await getVPNStatus('http://custom:7777');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:7777/api/v1/vpn/status',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response with JSON body', async () => {
      const errorBody = { error: 'service_unavailable', message: 'VPN daemon not running', statusCode: 503 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getVPNStatus()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getVPNStatus()).rejects.toEqual({
        error: 'unknown',
        message: 'Bad Gateway',
        statusCode: 502,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(getVPNStatus()).rejects.toThrow('Network failure');
    });
  });

  // -- connectVPN --

  describe('connectVPN', () => {
    it('sends POST and returns VPNStatus on successful connection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConnected),
      });

      const result = await connectVPN();

      expect(result).toEqual(mockConnected);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/vpn/connect`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConnected),
      });

      await connectVPN('http://custom:7777');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:7777/api/v1/vpn/connect',
        expect.any(Object),
      );
    });

    it('throws PluginError when already connected', async () => {
      const errorBody = { error: 'conflict', message: 'Already connected', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(connectVPN()).rejects.toEqual(errorBody);
    });

    it('throws PluginError on connection failure', async () => {
      const errorBody = { error: 'connection_failed', message: 'Unable to connect to VPN server', statusCode: 500 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve(errorBody),
      });

      await expect(connectVPN()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(connectVPN()).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
  });

  // -- disconnectVPN --

  describe('disconnectVPN', () => {
    it('sends POST and returns void for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await disconnectVPN();

      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/vpn/disconnect`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      await disconnectVPN('http://custom:7777');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:7777/api/v1/vpn/disconnect',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws PluginError when not connected', async () => {
      const errorBody = { error: 'conflict', message: 'Not connected', statusCode: 409 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve(errorBody),
      });

      await expect(disconnectVPN()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(disconnectVPN()).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection reset'));

      await expect(disconnectVPN()).rejects.toThrow('Connection reset');
    });
  });

  // -- getVPNHealth --

  describe('getVPNHealth', () => {
    it('sends GET and returns health status with no leaks', async () => {
      const health = { healthy: true, leakTest: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(health),
      });

      const result = await getVPNHealth();

      expect(result).toEqual(health);
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/vpn/health`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('returns unhealthy status with leak detected', async () => {
      const health = { healthy: false, leakTest: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(health),
      });

      const result = await getVPNHealth();

      expect(result.healthy).toBe(false);
      expect(result.leakTest).toBe(false);
    });

    it('accepts a custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ healthy: true, leakTest: true }),
      });

      await getVPNHealth('http://custom:7777');

      expect(fetch).toHaveBeenCalledWith(
        'http://custom:7777/api/v1/vpn/health',
        expect.any(Object),
      );
    });

    it('throws PluginError on non-OK response', async () => {
      const errorBody = { error: 'service_unavailable', message: 'Health check unavailable', statusCode: 503 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve(errorBody),
      });

      await expect(getVPNHealth()).rejects.toEqual(errorBody);
    });

    it('throws fallback PluginError when error body is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getVPNHealth()).rejects.toEqual({
        error: 'unknown',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    it('propagates network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(getVPNHealth()).rejects.toThrow('ECONNREFUSED');
    });
  });
});
