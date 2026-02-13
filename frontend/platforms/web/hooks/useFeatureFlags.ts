'use client';

import { useContext } from 'react';
import { FeatureFlagContext } from '@/lib/feature-flags/FeatureFlagProvider';
import type { FeatureFlags } from '@/types/config';

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagContext);
}
