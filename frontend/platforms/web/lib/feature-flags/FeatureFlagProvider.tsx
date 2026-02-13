'use client';

import { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FeatureFlags } from '@/types/config';

const DEFAULT_FLAGS: FeatureFlags = {
  vod: true,
  liveTV: false,
  sports: false,
  podcasts: false,
  games: false,
  dvr: false,
  downloads: false,
  watchParty: false,
};

export const FeatureFlagContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FeatureFlagProvider({
  children,
  flags,
}: {
  children: ReactNode;
  flags?: FeatureFlags | null;
}) {
  const value = useMemo(() => flags || DEFAULT_FLAGS, [flags]);
  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flag: keyof FeatureFlags,
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => {
    return (
      <FeatureFlagContext.Consumer>
        {(flags) => (flags[flag] ? <Component {...props} /> : null)}
      </FeatureFlagContext.Consumer>
    );
  };
  Wrapped.displayName = `withFeatureFlag(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}
