import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { FeatureFlagProvider } from '@/lib/feature-flags/FeatureFlagProvider';
import type { FeatureFlags } from '@/types/config';
import type { ReactNode } from 'react';

const customFlags: FeatureFlags = {
  vod: true,
  liveTV: true,
  sports: false,
  podcasts: true,
  games: false,
  dvr: true,
  downloads: false,
  watchParty: false,
};

describe('useFeatureFlags', () => {
  it('returns default flags when no provider flags set', () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <FeatureFlagProvider>{children}</FeatureFlagProvider>;
    }
    const { result } = renderHook(() => useFeatureFlags(), { wrapper });
    expect(result.current.vod).toBe(true);
    expect(result.current.liveTV).toBe(false);
  });

  it('returns custom flags from provider', () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <FeatureFlagProvider flags={customFlags}>{children}</FeatureFlagProvider>;
    }
    const { result } = renderHook(() => useFeatureFlags(), { wrapper });
    expect(result.current.vod).toBe(true);
    expect(result.current.liveTV).toBe(true);
    expect(result.current.sports).toBe(false);
    expect(result.current.podcasts).toBe(true);
    expect(result.current.dvr).toBe(true);
  });
});
