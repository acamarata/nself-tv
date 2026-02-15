'use client';

import { createContext, useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { FeatureFlags } from '@/types/config';
import { getEnvironmentConfig } from '@/lib/config/environment';
import { getServerFeatureFlags } from '@/lib/config/server-config';

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
  flags: initialFlags,
}: {
  children: ReactNode;
  flags?: FeatureFlags | null;
}) {
  const envConfig = getEnvironmentConfig();
  const [flags, setFlags] = useState<FeatureFlags>(
    initialFlags || envConfig.defaultFeatures,
  );

  useEffect(() => {
    // Fetch server-controlled feature flags on mount
    let isMounted = true;

    getServerFeatureFlags()
      .then((serverFlags) => {
        if (isMounted) {
          setFlags(serverFlags);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch server feature flags:', error);
        // Keep using default/initial flags
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(() => flags, [flags]);

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
