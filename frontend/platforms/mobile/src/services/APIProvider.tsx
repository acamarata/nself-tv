import React, { createContext, useContext, useMemo } from 'react';
import { NTVGraphQLClient } from '@ntv/shared';

interface APIContextValue {
  graphql: NTVGraphQLClient;
  baseURL: string;
}

const APIContext = createContext<APIContextValue | null>(null);

export function APIProvider({ children }: { children: React.ReactNode }) {
  const contextValue = useMemo(() => {
    // Get base URL from environment or use default for development
    const baseURL = 'http://localhost:8080';
    const graphqlEndpoint = `${baseURL}/v1/graphql`;

    const graphql = new NTVGraphQLClient({ endpoint: graphqlEndpoint });

    return {
      graphql,
      baseURL,
    };
  }, []);

  return (
    <APIContext.Provider value={contextValue}>
      {children}
    </APIContext.Provider>
  );
}

export function useAPI() {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within APIProvider');
  }
  return context;
}
