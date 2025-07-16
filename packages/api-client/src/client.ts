/**
 * HTTP API Client implementation
 */

import { 
  RequestConfig, 
  ApiClientResponse, 
  ApiClientConfig, 
  RequestInterceptor, 
  ResponseInterceptor,
  AuthConfig,
  HttpMethod,
  ApiErrorResponse
} from './types';
import { retry, RetryOptions } from '@codegenapp/core-utils';
import { AppError, NetworkError, TimeoutError } from '@codegenapp/core-utils';

export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private authConfig?: AuthConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: '',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: (status: number) => status >= 200 && status < 300,
      ...config,
    };
  }

  // Configuration methods
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  setAuth(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
    this.updateAuthHeaders();
  }

  clearAuth(): void {
    this.authConfig = undefined;
    this.removeAuthHeaders();
  }

  private updateAuthHeaders(): void {
    if (!this.authConfig) return;

    switch (this.authConfig.type) {
      case 'bearer':
        if (this.authConfig.token) {
          this.config.headers['Authorization'] = `Bearer ${this.authConfig.token}`;
        }
        break;
      case 'basic':
        if (this.authConfig.username && this.authConfig.password) {
          const credentials = btoa(`${this.authConfig.username}:${this.authConfig.password}`);
          this.config.headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'api-key':
        if (this.authConfig.apiKey) {
          const header = this.authConfig.apiKeyHeader || 'X-API-Key';
          this.config.headers[header] = this.authConfig.apiKey;
        }
        break;
    }
  }

  private removeAuthHeaders(): void {
    delete this.config.headers['Authorization'];
    delete this.config.headers['X-API-Key'];
  }

  // Interceptor methods
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  removeRequestInterceptor(interceptor: RequestInterceptor): void {
    const index = this.requestInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.requestInterceptors.splice(index, 1);
    }
  }

  removeResponseInterceptor(interceptor: ResponseInterceptor): void {
    const index = this.responseInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.responseInterceptors.splice(index, 1);
    }
  }

  // Request processing
  private async processRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        try {
          processedConfig = await interceptor.onRequest(processedConfig);
        } catch (error) {
          if (interceptor.onRequestError) {
            await interceptor.onRequestError(error);
          }
          throw error;
        }
      }
    }

    return processedConfig;
  }

  private async processResponseInterceptors<T>(
    response: ApiClientResponse<T>
  ): Promise<ApiClientResponse<T>> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        try {
          processedResponse = await interceptor.onResponse(processedResponse);
        } catch (error) {
          if (interceptor.onResponseError) {
            await interceptor.onResponseError(error);
          }
          throw error;
        }
      }
    }

    return processedResponse;
  }

  private async processResponseError(error: any): Promise<never> {
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponseError) {
        try {
          await interceptor.onResponseError(error);
        } catch (interceptorError) {
          throw interceptorError;
        }
      }
    }
    throw error;
  }

  // Core request method
  private async makeRequest<T>(config: RequestConfig): Promise<ApiClientResponse<T>> {
    // Process request interceptors
    const processedConfig = await this.processRequestInterceptors(config);

    // Build full URL
    const url = processedConfig.url.startsWith('http') 
      ? processedConfig.url 
      : `${this.config.baseURL}${processedConfig.url}`;

    // Build headers
    const headers = {
      ...this.config.headers,
      ...processedConfig.headers,
    };

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: processedConfig.method,
      headers,
      signal: AbortSignal.timeout(processedConfig.timeout || this.config.timeout),
    };

    // Add body for non-GET requests
    if (processedConfig.data && processedConfig.method !== 'GET') {
      if (typeof processedConfig.data === 'string') {
        fetchOptions.body = processedConfig.data;
      } else {
        fetchOptions.body = JSON.stringify(processedConfig.data);
      }
    }

    // Add query parameters
    if (processedConfig.params) {
      const urlObj = new URL(url);
      Object.entries(processedConfig.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.set(key, String(value));
        }
      });
      fetchOptions.body = urlObj.toString();
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      // Build response object
      const apiResponse: ApiClientResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        config: processedConfig,
      };

      // Validate status
      const validateStatus = processedConfig.validateStatus || this.config.validateStatus;
      if (!validateStatus(response.status)) {
        const errorResponse: ApiErrorResponse = {
          error: 'HTTP Error',
          message: `Request failed with status ${response.status}`,
          statusCode: response.status,
          details: data,
        };
        throw new AppError(errorResponse.message, `HTTP_${response.status}`, response.status);
      }

      // Process response interceptors
      return await this.processResponseInterceptors(apiResponse);

    } catch (error: any) {
      // Handle different error types
      if (error.name === 'AbortError') {
        throw new TimeoutError('Request timed out');
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError('Network error occurred');
      }

      // Process error through interceptors
      await this.processResponseError(error);
      throw error;
    }
  }

  // Public request methods with retry logic
  async request<T>(config: RequestConfig): Promise<ApiClientResponse<T>> {
    const retryOptions: RetryOptions = {
      maxAttempts: config.retries || this.config.retries,
      delay: config.retryDelay || this.config.retryDelay,
      retryCondition: (error: any) => {
        // Retry on network errors and 5xx status codes
        return error instanceof NetworkError || 
               error instanceof TimeoutError ||
               (error instanceof AppError && error.statusCode >= 500);
      },
    };

    return retry(() => this.makeRequest<T>(config), retryOptions);
  }

  // Convenience methods
  async get<T>(url: string, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  async post<T>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  async put<T>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  async patch<T>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data, ...config });
  }

  async delete<T>(url: string, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }

  // Utility methods
  async head(url: string, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<void>> {
    return this.request<void>({ method: 'HEAD' as HttpMethod, url, ...config });
  }

  async options(url: string, config: Partial<RequestConfig> = {}): Promise<ApiClientResponse<void>> {
    return this.request<void>({ method: 'OPTIONS' as HttpMethod, url, ...config });
  }

  // File upload method
  async upload<T>(
    url: string, 
    file: File | Blob, 
    config: Partial<RequestConfig> = {}
  ): Promise<ApiClientResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const uploadConfig: RequestConfig = {
      method: 'POST',
      url,
      data: formData,
      headers: {
        // Remove Content-Type to let browser set it with boundary
        ...config.headers,
      },
      ...config,
    };

    // Remove Content-Type for FormData
    delete uploadConfig.headers?.['Content-Type'];

    return this.request<T>(uploadConfig);
  }

  // Create a new instance with different configuration
  create(config: Partial<ApiClientConfig> = {}): ApiClient {
    return new ApiClient({ ...this.config, ...config });
  }
}

// Default client instance
export const apiClient = new ApiClient();

