import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAcquisitionRules } from '@/hooks/useAcquisitionRules';
import * as AcquisitionClient from '@/lib/plugins/acquisition-client';
import type { DownloadRule, CreateRuleRequest } from '@/types/acquisition';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      familyId: 'family-123',
      email: 'test@test.com',
      displayName: 'Test',
      avatarUrl: null,
      defaultRole: 'user',
      roles: ['user'],
      createdAt: '2026-01-01',
    },
    tokens: {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 900,
      expiresAt: Date.now() + 900000,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
  }),
}));

vi.mock('@/lib/plugins/acquisition-client');

const mockListRules = vi.mocked(AcquisitionClient.listRules);
const mockCreateRule = vi.mocked(AcquisitionClient.createRule);
const mockUpdateRule = vi.mocked(AcquisitionClient.updateRule);
const mockDeleteRule = vi.mocked(AcquisitionClient.deleteRule);
const mockTestRule = vi.mocked(AcquisitionClient.testRule);

const mockRule: DownloadRule = {
  id: 'rule-1',
  familyId: 'family-123',
  name: 'HD Only Rule',
  priority: 1,
  conditions: { minResolution: '1080p', maxSize: 5000000000 },
  action: 'auto_download',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-14T00:00:00Z',
};

const mockRule2: DownloadRule = {
  id: 'rule-2',
  familyId: 'family-123',
  name: 'Notify for 4K',
  priority: 2,
  conditions: { minResolution: '2160p' },
  action: 'notify',
  enabled: true,
  createdAt: '2026-01-10T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const mockRule3: DownloadRule = {
  id: 'rule-3',
  familyId: 'family-123',
  name: 'Skip Low Quality',
  priority: 3,
  conditions: { maxResolution: '480p' },
  action: 'skip',
  enabled: false,
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
};

describe('useAcquisitionRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRules.mockResolvedValue([mockRule, mockRule2, mockRule3]);
    mockCreateRule.mockResolvedValue(mockRule);
    mockUpdateRule.mockResolvedValue(mockRule);
    mockDeleteRule.mockResolvedValue(undefined);
    mockTestRule.mockResolvedValue({ matches: true, action: 'auto_download' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial fetch', () => {
    it('should start in loading state with empty rules', () => {
      mockListRules.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useAcquisitionRules());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.rules).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch rules on mount', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockListRules).toHaveBeenCalledWith(
        'family-123',
        expect.any(String),
      );
      expect(result.current.rules).toEqual([mockRule, mockRule2, mockRule3]);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockListRules.mockRejectedValue(new Error('Server error'));
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.rules).toEqual([]);
    });

    it('should handle non-Error rejection with default message', async () => {
      mockListRules.mockRejectedValue(undefined);
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch rules');
    });
  });

  describe('no auto-refresh', () => {
    it('should not have auto-refresh behavior', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      try {
        const { result } = renderHook(() => useAcquisitionRules());

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockListRules).toHaveBeenCalledTimes(1);

        mockListRules.mockClear();

        await act(async () => {
          vi.advanceTimersByTime(300000); // 5 minutes
        });

        expect(mockListRules).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('refetch', () => {
    it('should manually refetch data', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockListRules).toHaveBeenCalledTimes(2);
    });

    it('should clear previous error on refetch', async () => {
      mockListRules.mockRejectedValueOnce(new Error('Flaky'));
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.error).toBe('Flaky');
      });

      mockListRules.mockResolvedValue([mockRule]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.rules).toEqual([mockRule]);
    });
  });

  describe('create', () => {
    it('should create a rule and refetch', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const params: CreateRuleRequest = {
        name: 'New Rule',
        priority: 5,
        conditions: { genre: 'documentary' },
        action: 'auto_download',
      };

      let created: DownloadRule | undefined;
      await act(async () => {
        created = await result.current.create(params);
      });

      expect(mockCreateRule).toHaveBeenCalledWith(
        'family-123',
        params,
        expect.any(String),
      );
      expect(created).toEqual(mockRule);
      expect(mockListRules).toHaveBeenCalledTimes(2);
    });

    it('should propagate create errors', async () => {
      mockCreateRule.mockRejectedValue(new Error('Duplicate rule'));

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.create({
            name: 'Dup',
            priority: 1,
            conditions: {},
            action: 'skip',
          });
        }),
      ).rejects.toThrow('Duplicate rule');
    });
  });

  describe('update', () => {
    it('should update a rule and refetch', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateParams: Partial<CreateRuleRequest> = {
        priority: 10,
        action: 'notify',
      };

      await act(async () => {
        await result.current.update('rule-1', updateParams);
      });

      expect(mockUpdateRule).toHaveBeenCalledWith(
        'rule-1',
        updateParams,
        expect.any(String),
      );
      expect(mockListRules).toHaveBeenCalledTimes(2);
    });

    it('should propagate update errors', async () => {
      mockUpdateRule.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.update('rule-1', { name: 'Bad' });
        }),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should delete a rule and refetch', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.remove('rule-3');
      });

      expect(mockDeleteRule).toHaveBeenCalledWith(
        'rule-3',
        expect.any(String),
      );
      expect(mockListRules).toHaveBeenCalledTimes(2);
    });

    it('should propagate delete errors', async () => {
      mockDeleteRule.mockRejectedValue(new Error('Delete denied'));

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.remove('rule-1');
        }),
      ).rejects.toThrow('Delete denied');
    });
  });

  describe('test', () => {
    it('should test a rule with sample content and return match result', async () => {
      mockTestRule.mockResolvedValue({ matches: true, action: 'auto_download' });

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const sampleContent = {
        title: 'Test Show S01E01 1080p WEB-DL',
        size: 2000000000,
        quality: '1080p',
      };

      let testResult: { matches: boolean; action: string } | undefined;
      await act(async () => {
        testResult = await result.current.test('rule-1', sampleContent);
      });

      expect(mockTestRule).toHaveBeenCalledWith(
        'rule-1',
        sampleContent,
        expect.any(String),
      );
      expect(testResult).toEqual({ matches: true, action: 'auto_download' });
    });

    it('should return non-matching result for content that does not match', async () => {
      mockTestRule.mockResolvedValue({ matches: false, action: 'skip' });

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: { matches: boolean; action: string } | undefined;
      await act(async () => {
        testResult = await result.current.test('rule-3', { title: '4K Movie', quality: '2160p' });
      });

      expect(testResult).toEqual({ matches: false, action: 'skip' });
    });

    it('should not trigger refetch when testing a rule', async () => {
      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.test('rule-1', { title: 'test' });
      });

      // Only the initial fetch, no extra
      expect(mockListRules).toHaveBeenCalledTimes(1);
    });

    it('should propagate test errors', async () => {
      mockTestRule.mockRejectedValue(new Error('Test service unavailable'));

      const { result } = renderHook(() => useAcquisitionRules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.test('rule-1', {});
        }),
      ).rejects.toThrow('Test service unavailable');
    });
  });
});
