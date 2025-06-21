/**
 * Centralized API client with modern fetch patterns, error handling, and TypeScript support
 */

// Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface AgentRun {
  id: number;
  external_id?: number;
  organization_id: number;
  status: string;
  prompt?: string;
  result?: string;
  web_url?: string;
  created_at?: string;
  updated_at?: string;
  data?: Record<string, any>;
}

export interface Message {
  id?: number;
  agent_run_id: number;
  message_text: string;
  message_type: 'user' | 'system';
  created_at?: string;
  data?: Record<string, any>;
}

export interface DatabaseConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password?: string;
  password_encrypted?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'error';
  timestamp?: string;
  pool_total?: number;
  pool_idle?: number;
  pool_waiting?: number;
  error?: string;
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = 10000;

// Enhanced fetch with timeout, retries, and error handling
class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.timeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
      };
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await this.fetchWithTimeout(url, options);
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Database Health
  async getDatabaseHealth(): Promise<ApiResponse<DatabaseHealth>> {
    return this.get<DatabaseHealth>('/database/health');
  }

  // Agent Runs
  async saveAgentRun(agentRun: Partial<AgentRun>): Promise<ApiResponse<AgentRun>> {
    return this.post<AgentRun>('/database/agent-runs', agentRun);
  }

  async getAgentRuns(
    organizationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<AgentRun[]>> {
    return this.get<AgentRun[]>(`/database/agent-runs/${organizationId}?limit=${limit}&offset=${offset}`);
  }

  async getAgentRun(id: number): Promise<ApiResponse<AgentRun>> {
    return this.get<AgentRun>(`/database/agent-run/${id}`);
  }

  // Messages
  async sendMessage(
    agentRunId: number,
    message: string,
    messageType: 'user' | 'system' = 'user',
    data: Record<string, any> = {}
  ): Promise<ApiResponse<Message>> {
    return this.post<Message>(`/database/agent-runs/${agentRunId}/messages`, {
      message,
      messageType,
      data,
    });
  }

  async getMessages(agentRunId: number): Promise<ApiResponse<Message[]>> {
    return this.get<Message[]>(`/database/agent-runs/${agentRunId}/messages`);
  }

  // Database Configuration
  async saveDatabaseConfig(config: Omit<DatabaseConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<DatabaseConfig>> {
    return this.post<DatabaseConfig>('/database/config', config);
  }

  async getDatabaseConfigs(): Promise<ApiResponse<DatabaseConfig[]>> {
    return this.get<DatabaseConfig[]>('/database/configs');
  }

  async testDatabaseConnection(config: Omit<DatabaseConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post<{ success: boolean; message: string }>('/database/test-connection', config);
  }

  // Codegen API Proxy
  async proxyToCodegen<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // Remove /database prefix for proxy calls
    const proxyEndpoint = endpoint.startsWith('/database') ? endpoint.replace('/database', '') : endpoint;
    return this.request<T>(proxyEndpoint, options);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Convenience hooks for React components
export const useApi = () => {
  return {
    // Database operations
    getDatabaseHealth: () => apiClient.getDatabaseHealth(),
    saveAgentRun: (agentRun: Partial<AgentRun>) => apiClient.saveAgentRun(agentRun),
    getAgentRuns: (orgId: number, limit?: number, offset?: number) => 
      apiClient.getAgentRuns(orgId, limit, offset),
    getAgentRun: (id: number) => apiClient.getAgentRun(id),
    sendMessage: (agentRunId: number, message: string, type?: 'user' | 'system', data?: Record<string, any>) =>
      apiClient.sendMessage(agentRunId, message, type, data),
    getMessages: (agentRunId: number) => apiClient.getMessages(agentRunId),
    saveDatabaseConfig: (config: Omit<DatabaseConfig, 'id' | 'created_at' | 'updated_at'>) =>
      apiClient.saveDatabaseConfig(config),
    getDatabaseConfigs: () => apiClient.getDatabaseConfigs(),
    testDatabaseConnection: (config: Omit<DatabaseConfig, 'id' | 'created_at' | 'updated_at'>) =>
      apiClient.testDatabaseConnection(config),
    
    // Codegen API proxy
    proxyToCodegen: <T>(endpoint: string, options?: RequestInit) =>
      apiClient.proxyToCodegen<T>(endpoint, options),
  };
};

export default apiClient;

