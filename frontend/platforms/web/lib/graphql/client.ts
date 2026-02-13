import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';

const TOKEN_KEY = 'ntv_tokens';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const tokens = JSON.parse(raw);
    return tokens.accessToken || null;
  } catch {
    return null;
  }
}

export function createApolloClient(graphqlUrl?: string) {
  const httpLink = createHttpLink({
    uri: graphqlUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    const token = getAccessToken();
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            media_items: {
              keyArgs: ['where', 'order_by'],
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}

export type { ApolloClient };
