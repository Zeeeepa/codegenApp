import { showToast, ToastStyle } from "../utils/toast";
import { getCredentials, showCredentialsError, validateCredentials } from "../utils/credentials";
import { clearStoredUserInfo } from "../storage/userStorage";
import { getBackgroundMonitoringService } from "../utils/backgroundMonitoring";
import { getAgentRunCache } from "../storage/agentRunCache";
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
    let userFriendlyMessage = '';
    
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

    if (response.status === 404) {
      if (response.url?.includes('/resume')) {
        userFriendlyMessage = "Resume endpoint not found. The agent run may not support resuming, or the API structure has changed.";
        await showToast({
          style: ToastStyle.Failure,
          title: "Endpoint Not Found",
          message: userFriendlyMessage,
        });
        throw new Error(userFriendlyMessage);
      }
    }

    if (response.status === 429) {
      await showToast({
        style: ToastStyle.Failure,
        title: "Rate Limit Exceeded",
        message: "Please wait a moment before trying again.",
      });
      throw new Error("Rate limit exceeded");
    }

    // Handle server errors
    if (response.status >= 500) {
      userFriendlyMessage = "Server error occurred. Please try again later.";
      await showToast({
        style: ToastStyle.Failure,
        title: "Server Error",
        message: userFriendlyMessage,
      });
      throw new Error(userFriendlyMessage);
    }

    await showToast({
      style: ToastStyle.Failure,
      title: "API Error",
      message: errorMessage,
    });

    // Log detailed error for debugging
    console.error(`❌ API request failed for ${response.url}:`, {
      status: response.status,
      statusText: response.statusText,
      message: errorMessage,
      url: response.url,
    });

    throw new Error(errorMessage);
  }

  // Agent Run Methods
  async createAgentRun(
    organizationId: number,
    request: CreateAgentRunRequest
  ): Promise<AgentRunResponse> {
    const response = await this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_CREATE(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );

    // Automatically add the new agent run to monitoring
    try {
      const cache = getAgentRunCache();
      const monitoringService = getBackgroundMonitoringService();
      
      // Add to cache and tracking
      await cache.updateAgentRun(organizationId, response);
      
      // Start monitoring service if not already running
      if (!monitoringService.isMonitoring()) {
        await monitoringService.start();
      }
      
      console.log(`✅ Agent run #${response.id} automatically added to monitoring`);
      
      await showToast({
        style: ToastStyle.Success,
        title: "Agent Run Created",
        message: `Run #${response.id} created and added to monitoring`,
      });
      
    } catch (monitoringError) {
      console.error('Failed to add agent run to monitoring:', monitoringError);
      // Don't fail the creation if monitoring fails
      await showToast({
        style: ToastStyle.Warning,
        title: "Monitoring Setup Failed",
        message: `Run #${response.id} created but monitoring setup failed`,
      });
    }

    return response;
  }

  async listAgentRuns(
    organizationId: number
  ): Promise<{ items: AgentRunResponse[] }> {
    // ✅ ENDPOINT VALIDATION: List agent runs is WORKING
    // Tested endpoint returns 200: GET /v1/organizations/{orgId}/agent/runs
    return this.makeRequest<{ items: AgentRunResponse[] }>(
      API_ENDPOINTS.AGENT_RUN_LIST(organizationId)
    );
  }

  async getAgentRun(
    organizationId: number,
    agentRunId: number
  ): Promise<AgentRunResponse> {
    // ❌ ENDPOINT VALIDATION: Individual agent run details NOT available via REST API
    // Tested endpoint returns 404: GET /v1/organizations/{orgId}/agent/run/{id}
    
    const errorMessage = "Individual agent run details are not available via the Codegen REST API. " +
      "Please use the agent runs list or web interface to view agent run information.";
    
    await showToast({
      style: ToastStyle.Failure,
      title: "Feature Not Available",
      message: errorMessage,
    });
    
    throw new Error(errorMessage);
  }

  async resumeAgentRun(
    organizationId: number,
    request: ResumeAgentRunRequest
  ): Promise<AgentRunResponse> {
    // ❌ ENDPOINT VALIDATION: Resume functionality is NOT available via REST API
    // All tested resume endpoints return 404:
    // - POST /v1/organizations/{orgId}/agent/run/{id}/resume
    // - POST /v1/organizations/{orgId}/agent/run/{id}/continue  
    // - POST /v1/organizations/{orgId}/agent-runs/{id}/resume
    // - POST /v1/beta/organizations/{orgId}/agent/run/resume
    
    const errorMessage = "Resume functionality is not available via the Codegen REST API. " +
      "Please use the web interface to interact with running agents.";
    
    await showToast({
      style: ToastStyle.Failure,
      title: "Feature Not Available",
      message: errorMessage,
    });
    
    throw new Error(errorMessage);
  }

  async stopAgentRun(
    organizationId: number,
    request: StopAgentRunRequest
  ): Promise<AgentRunResponse> {
    // ❌ ENDPOINT VALIDATION: Stop functionality is NOT available via REST API
    // Tested endpoint returns 404: POST /v1/organizations/{orgId}/agent/run/{id}/stop
    
    const errorMessage = "Stop functionality is not available via the Codegen REST API. " +
      "Please use the web interface to stop running agents.";
    
    await showToast({
      style: ToastStyle.Failure,
      title: "Feature Not Available", 
      message: errorMessage,
    });
    
    throw new Error(errorMessage);
  }

  // Organization Methods
  async getOrganizations(
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<OrganizationResponse>> {
    return this.makeRequest<PaginatedResponse<OrganizationResponse>>(
      API_ENDPOINTS.ORGANIZATIONS_PAGINATED(page, size)
    );
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
