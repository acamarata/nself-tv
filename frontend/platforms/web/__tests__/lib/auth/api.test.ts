import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register, refreshToken, logout, forgotPassword, resetPassword, AuthError, requestDeviceCode, pollDeviceCode, authorizeDeviceCode } from '@/lib/auth/api';

describe('auth API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('calls signin endpoint and returns user + tokens', async () => {
      const mockResponse = {
        session: { accessToken: 'at123', refreshToken: 'rt123', accessTokenExpiresIn: 900 },
        user: { id: 'u1', email: 'test@test.com', displayName: 'Test', avatarUrl: '', defaultRole: 'user', roles: [{ role: 'user' }], createdAt: '2026-01-01' },
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await login({ email: 'test@test.com', password: 'pass123' });
      expect(result.user.id).toBe('u1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.roles).toEqual(['user']);
      expect(result.tokens.accessToken).toBe('at123');
      expect(result.tokens.refreshToken).toBe('rt123');
      expect(result.tokens.expiresIn).toBe(900);
      expect(result.tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws AuthError on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await expect(login({ email: 'bad@test.com', password: 'wrong' }))
        .rejects.toThrow(AuthError);
    });
  });

  describe('register', () => {
    it('calls signup endpoint and returns user + tokens', async () => {
      const mockResponse = {
        session: { accessToken: 'at123', refreshToken: 'rt123', accessTokenExpiresIn: 900 },
        user: { id: 'u2', email: 'new@test.com', displayName: 'New User', avatarUrl: '', defaultRole: 'user', roles: [{ role: 'user' }], createdAt: '2026-01-01' },
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await register({ email: 'new@test.com', password: 'pass123', displayName: 'New User', familyName: 'User' });
      expect(result.user.id).toBe('u2');
      expect(result.user.displayName).toBe('New User');
    });
  });

  describe('refreshToken', () => {
    it('calls token endpoint and returns new tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-at', refreshToken: 'new-rt', accessTokenExpiresIn: 900 }),
      });

      const result = await refreshToken('rt123');
      expect(result.accessToken).toBe('new-at');
      expect(result.refreshToken).toBe('new-rt');
    });
  });

  describe('logout', () => {
    it('calls signout endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logout('rt123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/signout'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('calls password reset endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await forgotPassword('test@test.com');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/password/reset'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('resetPassword', () => {
    it('calls password reset change endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await resetPassword('ticket123', 'newPass123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/password/reset/change'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('device code', () => {
    it('requestDeviceCode calls correct endpoint', async () => {
      const mockResponse = { userCode: 'ABC123', deviceCode: 'dc123', expiresIn: 600, interval: 5, verificationUri: 'http://localhost/device-code' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await requestDeviceCode();
      expect(result.userCode).toBe('ABC123');
      expect(result.deviceCode).toBe('dc123');
    });

    it('pollDeviceCode calls poll endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      });

      const result = await pollDeviceCode('dc123');
      expect(result.status).toBe('pending');
    });

    it('authorizeDeviceCode calls authorize endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await authorizeDeviceCode('ABC123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/device-code/authorize'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('AuthError', () => {
    it('has correct name and statusCode', () => {
      const error = new AuthError('test message', 401);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('test message');
      expect(error.statusCode).toBe(401);
      expect(error instanceof Error).toBe(true);
    });
  });
});
