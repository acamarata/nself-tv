export * from './client';
export * from './graphql';
export * from './auth';
export * from './media';
export * from './profiles';

import { HttpClient, type HttpClientConfig } from './client';
import { NTVGraphQLClient, type GraphQLClientConfig } from './graphql';
import { AuthAPI } from './auth';
import { MediaAPI } from './media';
import { ProfilesAPI } from './profiles';

/**
 * API client configuration
 */
export interface APIClientConfig {
  baseUrl: string;
  graphqlUrl: string;
  timeout?: number;
  retryAttempts?: number;
  getAuthToken?: () => Promise<string | null>;
}

/**
 * Unified API client with all service clients
 */
export class APIClient {
  public http: HttpClient;
  public graphql: NTVGraphQLClient;
  public auth: AuthAPI;
  public media: MediaAPI;
  public profiles: ProfilesAPI;

  constructor(config: APIClientConfig) {
    // Initialize HTTP client
    const httpConfig: HttpClientConfig = {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      getAuthToken: config.getAuthToken
    };
    this.http = new HttpClient(httpConfig);

    // Initialize GraphQL client
    const graphqlConfig: GraphQLClientConfig = {
      endpoint: config.graphqlUrl,
      getAuthToken: config.getAuthToken
    };
    this.graphql = new NTVGraphQLClient(graphqlConfig);

    // Initialize service clients
    this.auth = new AuthAPI(this.http);
    this.media = new MediaAPI(this.http);
    this.profiles = new ProfilesAPI(this.http);
  }

  /**
   * Set auth token getter for all clients
   */
  setAuthTokenGetter(getter: () => Promise<string | null>): void {
    this.http = new HttpClient({
      baseUrl: this.http['baseUrl'],
      timeout: this.http['timeout'],
      retryAttempts: this.http['retryAttempts'],
      getAuthToken: getter
    });

    this.graphql.setAuthTokenGetter(getter);

    // Reinitialize service clients with new HTTP client
    this.auth = new AuthAPI(this.http);
    this.media = new MediaAPI(this.http);
    this.profiles = new ProfilesAPI(this.http);
  }
}
