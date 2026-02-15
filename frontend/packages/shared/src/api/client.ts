/**
 * Base HTTP client with retry logic and error handling
 */

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  getAuthToken?: () => Promise<string | null>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  skipAuth?: boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private getAuthToken?: () => Promise<string | null>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? 30000; // 30s default
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000; // 1s base delay
    this.getAuthToken = config.getAuthToken;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method ?? 'GET';
    const timeout = options.timeout ?? this.timeout;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        // Add auth token to headers if available
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options.headers
        };

        if (!options.skipAuth && this.getAuthToken) {
          const token = await this.getAuthToken();
          if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
          }
        }

        // Create request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Parse response
        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json')
          ? await response.json()
          : await response.text();

        // Check for HTTP errors
        if (!response.ok) {
          throw new HttpError(
            data.message ?? `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            data
          );
        }

        // Return successful response
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value: string, key: string) => {
          responseHeaders[key] = value;
        });

        return {
          data: data as T,
          status: response.status,
          headers: responseHeaders
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) or abort
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new HttpError('Request timeout', 408);
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError ?? new Error('Request failed after all retry attempts');
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
