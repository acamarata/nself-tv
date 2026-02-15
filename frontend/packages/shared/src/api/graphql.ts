import { GraphQLClient } from 'graphql-request';

/**
 * GraphQL client configuration
 */
export interface GraphQLClientConfig {
  endpoint: string;
  getAuthToken?: () => Promise<string | null>;
}

/**
 * Type-safe GraphQL client wrapper
 */
export class NTVGraphQLClient {
  private client: GraphQLClient;
  private getAuthToken?: () => Promise<string | null>;

  constructor(config: GraphQLClientConfig) {
    this.client = new GraphQLClient(config.endpoint);
    this.getAuthToken = config.getAuthToken;
  }

  /**
   * Execute GraphQL query
   */
  async query<T = any, V extends Record<string, any> = Record<string, any>>(
    query: string,
    variables?: V
  ): Promise<T> {
    const headers = await this.getHeaders();
    return this.client.request<T>(query, variables as any, headers);
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate<T = any, V extends Record<string, any> = Record<string, any>>(
    mutation: string,
    variables?: V
  ): Promise<T> {
    const headers = await this.getHeaders();
    return this.client.request<T>(mutation, variables as any, headers);
  }

  /**
   * Get request headers with auth token
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Set auth token getter
   */
  setAuthTokenGetter(getter: () => Promise<string | null>): void {
    this.getAuthToken = getter;
  }
}
