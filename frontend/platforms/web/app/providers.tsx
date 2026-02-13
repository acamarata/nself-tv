'use client';

import { ApolloProvider } from '@apollo/client';
import { useMemo } from 'react';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { FeatureFlagProvider } from '@/lib/feature-flags/FeatureFlagProvider';
import { createApolloClient } from '@/lib/graphql/client';
import { useServerConfig } from '@/hooks/useServerConfig';

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { config } = useServerConfig();
  const apolloClient = useMemo(() => createApolloClient(config?.endpoints?.graphql), [config]);

  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <ThemeProvider branding={config?.branding}>
          <FeatureFlagProvider flags={config?.features}>
            {children}
          </FeatureFlagProvider>
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <InnerProviders>{children}</InnerProviders>;
}
