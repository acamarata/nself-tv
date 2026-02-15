import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaybackSession } from '@/hooks/usePlaybackSession';
import * as useAuthModule from '@/hooks/useAuth';
import * as useProfilesModule from '@/hooks/useProfiles';
import * as deviceModule from '@/lib/device';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useProfiles');
vi.mock('@/lib/device');

const mockUseAuth = vi.mocked(useAuthModule.useAuth);
const mockUseProfiles = vi.mocked(useProfilesModule.useProfiles);
const mockGetDeviceId = vi.mocked(deviceModule.getDeviceId);

const mockUser = {
  id: 'user-123',
  familyId: 'family-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  defaultRole: 'user',
  roles: ['user'],
  createdAt: '2024-01-01T00:00:00Z',
};

const mockTokens = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600000,
};

const mockProfile = {
  id: 'profile-123',
  userId: 'user-123',
  familyId: 'family-123',
  displayName: 'Test Profile',
  avatarUrl: null,
  contentRatingLimit: 'TV-MA',
  language: 'en',
  subtitleLanguage: 'en',
  audioLanguage: 'en',
  autoplayNext: true,
  preferences: null,
  isDefault: true,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('usePlaybackSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.fetch = vi.fn();
    mockGetDeviceId.mockReturnValue('device-123');
    mockUseAuth.mockReturnValue({
      user: mockUser,
      tokens: mockTokens,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
    });
    mockUseProfiles.mockReturnValue({
      profiles: [mockProfile],
      currentProfile: mockProfile,
      isLoading: false,
      selectProfile: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
      needsProfileSelection: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('startSession', () => {
    it('should successfully start a playback session', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          mediaUrl: 'https://cdn.example.com/media-456/manifest.m3u8?token=stream-token-123',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456', 'TV-14'));

      await act(async () => {
        await result.current.startSession();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admit'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer access-token-123',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('media-456'),
        })
      );

      expect(result.current.session).toEqual({
        sessionId: 'session-123',
        mediaId: 'media-456',
        signedUrl: mockResponse.data.mediaUrl,
        expiresAt: expect.any(Number),
        startedAt: expect.any(Number),
      });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should include all required admission request fields', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456', 'PG-13'));

      await act(async () => {
        await result.current.startSession();
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toEqual({
        userId: 'user-123',
        mediaId: 'media-456',
        deviceId: 'device-123',
        familyId: 'family-123', // Now uses real familyId from user object
        userRole: 'user',
        contentRating: 'PG-13',
        profileContentRatingLimit: 'TV-MA',
      });
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized', message: 'Invalid token' }),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow(
          'Authentication required. Please log in again.'
        );
      });

      expect(result.current.error).toBe('Authentication required. Please log in again.');
      expect(result.current.session).toBeNull();
    });

    it('should handle 403 policy denied error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'policy_denied',
          message: 'Content rating exceeds profile limit',
        }),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow(
          'Content rating exceeds profile limit'
        );
      });

      expect(result.current.error).toBe('Content rating exceeds profile limit');
    });

    it('should handle 429 concurrency limit error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'concurrency_limit',
          message: 'Family has 3/3 streams active',
        }),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow(
          'Concurrent stream limit reached. Please stop another stream and try again.'
        );
      });
    });

    it('should handle 429 device limit error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'device_limit',
          message: 'This device has reached its stream limit',
        }),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow(
          'Device limit reached. Please remove a device and try again.'
        );
      });
    });

    it('should handle 500 server error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'internal_error' }),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow(
          'Server error. Please try again later.'
        );
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await expect(result.current.startSession()).rejects.toThrow('Network error');
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should not start session if user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        forgotPassword: vi.fn(),
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.error).toBe('User not authenticated');
    });

    it('should use "NR" as default content rating if not provided', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date().toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456')); // No content rating

      await act(async () => {
        await result.current.startSession();
      });

      const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(requestBody.contentRating).toBe('NR');
    });
  });

  describe('heartbeat', () => {
    it('should send heartbeat when session is active', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      // Mock startSession
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      // Mock heartbeat
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      // Advance timers to trigger heartbeat interval (60s)
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      // Heartbeat should have been called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/heartbeat/session-123'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer access-token-123',
          }),
        })
      );
    });

    it('should not throw on heartbeat failure', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      // Mock heartbeat failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Advance timers to trigger heartbeat and wait for async promises
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        await Promise.resolve(); // Flush microtasks
      });

      // Heartbeat failure should not throw
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Heartbeat failed for session session-123: 404'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('endSession', () => {
    it('should end an active session', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      // Start session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      // End session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/session/session-123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer access-token-123',
          }),
        })
      );

      expect(result.current.session).toBeNull();
    });

    it('should not throw on endSession failure', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to end session session-123: 500'
      );
      expect(result.current.session).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should clear session even if DELETE request fails', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.endSession();
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clear heartbeat interval on unmount', async () => {
      const mockResponse = {
        data: {
          sessionId: 'session-123',
          token: 'stream-token-123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result, unmount } = renderHook(() => usePlaybackSession('media-456'));

      await act(async () => {
        await result.current.startSession();
      });

      unmount();

      // Advance timers after unmount
      vi.advanceTimersByTime(60_000);

      // Heartbeat should not be called after unmount
      const heartbeatCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
        call[0].includes('/heartbeat/')
      );
      expect(heartbeatCalls.length).toBe(0);
    });
  });
});
