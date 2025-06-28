import { showToast, ToastStyle } from "../utils/toast";
import { getCredentials, showCredentialsError, validateCredentials } from "../utils/credentials";
import { clearStoredUserInfo } from "../storage/userStorage";
import { API_ENDPOINTS, DEFAULT_API_BASE_URL } from "./constants";
import {
  AgentRunResponse,
  UserResponse,
  OrganizationResponse,
  CreateAgentRunRequest,
  ResumeAgentRunRequest,
  StopAgentRunRequest,
  PaginatedResponse,
  APIError,
} from "./types";

export class CodegenAPIClient {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    // Note: Constructor cannot be async, so we'll handle credentials in makeRequest
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.apiToken = '';
  }

  private async initializeCredentials(): Promise<void> {
    if (!this.apiToken) {
      const credentials = await getCredentials();
      this.baseUrl = credentials.apiBaseUrl || DEFAULT_API_BASE_URL;
      this.apiToken = credentials.apiToken;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.initializeCredentials();
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('🌐 Making API request:', {
      url,
      endpoint,
      baseUrl: this.baseUrl,
      hasToken: !!this.apiToken,
      tokenLength: this.apiToken?.length || 0
    });
    
    const defaultHeaders = {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        ...options,
        mode: "cors",
        credentials: "include",
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      console.log('📡 API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        await this.handleAPIError(response);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, {
        error,
        url,
        message: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Request failed: ${error}`);
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData = await response.json() as APIError;
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If we can't parse the error response, use the default message
    }

    if (response.status === 401) {
      await showCredentialsError("Invalid API token. Please check your credentials in extension preferences.");
      throw new Error("Authentication failed");
    }

    if (response.status === 403) {
      await showCredentialsError("Access denied. Please ensure your API token has the required permissions.");
      throw new Error("Access denied");
    }

    // Rate limiting completely removed - no more 429 handling

    await showToast({
      style: ToastStyle.Failure,
      title: "API Error",
      message: errorMessage,
    });

    throw new Error(errorMessage);
  }

  // Agent Run Methods
  async createAgentRun(
    organizationId: number,
    request: CreateAgentRunRequest
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_CREATE(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async getAgentRun(
    organizationId: number,
    agentRunId: number
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_GET(organizationId, agentRunId)
    );
  }

  async resumeAgentRun(
    organizationId: number,
    request: ResumeAgentRunRequest
  ): Promise<AgentRunResponse> {
    console.log("🔄 Resume Agent Run API Call:", {
      organizationId,
      request,
      endpoint: API_ENDPOINTS.AGENT_RUN_RESUME(organizationId, request.agent_run_id)
    });
    
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_RESUME(organizationId, request.agent_run_id),
      {
        method: "POST",
        body: JSON.stringify({ prompt: request.prompt }),
      }
    );
  }

  async stopAgentRun(
    organizationId: number,
    request: StopAgentRunRequest
  ): Promise<AgentRunResponse> {
    console.log("⏹️ Stop Agent Run API Call:", {
      organizationId,
      request,
      endpoint: API_ENDPOINTS.AGENT_RUN_STOP(organizationId)
    });
    
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_STOP(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  // Organization Methods
  async getOrganizations(): Promise<{ items: OrganizationResponse[] }> {
    const response = await this.makeRequest<{ items?: OrganizationResponse[] }>(
      API_ENDPOINTS.ORGANIZATIONS
    );
    
    // Ensure we return the expected format
    return {
      items: response.items || []
    };
  }

  // User Methods
  async getUsers(
    organizationId: number,
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<UserResponse>> {
    return this.makeRequest<PaginatedResponse<UserResponse>>(
      API_ENDPOINTS.ORG_USERS(organizationId, page, size)
    );
  }

  async getUser(
    organizationId: number,
    userId: number
  ): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(
      API_ENDPOINTS.ORG_USER(organizationId, userId)
    );
  }

  async getCurrentUser(
    organizationId: number,
    userId: number
  ): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(
      API_ENDPOINTS.ORG_USER(organizationId, userId)
    );
  }

  // Get current user info from alpha /me endpoint
  async getMe(): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(API_ENDPOINTS.USER_ME);
  }

  // Validation Method
  async validateConnection(): Promise<boolean> {
    try {
      const result = await validateCredentials();
      return result.isValid;
    } catch {
      return false;
    }
  }

  // Backend Automation Service Methods
  async resumeAgentRunAutomation(
    agentRunId: number,
    organizationId: number,
    prompt: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Extract authentication context from current browser session
      const authContext = await this.extractAuthContext();
      
      // Call backend automation service
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3500';
      console.log(`🔗 Attempting to connect to backend at: ${backendUrl}/api/resume-agent-run`);
      
      const response = await fetch(`${backendUrl}/api/resume-agent-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentRunId,
          organizationId,
          prompt,
          authContext
        })
      });

      console.log(`📡 Backend response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // If backend is not available (404, 500, etc.), provide helpful error message
        if (response.status === 404) {
          throw new Error(`Backend automation service not available. Please ensure the backend server is running at ${backendUrl}`);
        } else if (response.status >= 500) {
          throw new Error(`Backend server error (${response.status}). Please check the backend logs.`);
        } else {
          throw new Error(`Backend automation failed: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log(`✅ Backend response:`, result);
      return result;

    } catch (error) {
      console.error('Backend automation service error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend automation service. Please ensure the backend server is running.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async extractAuthContext(): Promise<any> {
    try {
      // Extract cookies
      const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
          name: name,
          value: value || '',
          domain: window.location.hostname,
          path: '/',
          httpOnly: false,
          secure: window.location.protocol === 'https:'
        };
      }).filter(cookie => cookie.name && cookie.value);

      // Extract localStorage
      const localStorage: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }

      // Extract sessionStorage
      const sessionStorage: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }

      return {
        cookies,
        localStorage,
        sessionStorage,
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to extract auth context:', error);
      return null;
    }
  }
}

// Singleton instance
let apiClient: CodegenAPIClient | null = null;

export function getAPIClient(): CodegenAPIClient {
  if (!apiClient) {
    apiClient = new CodegenAPIClient();
  }
  return apiClient;
}

// Reset the client (useful when credentials change)
export async function resetAPIClient(): Promise<void> {
  apiClient = null;
  // Clear stored user info when credentials change
  await clearStoredUserInfo();
}
