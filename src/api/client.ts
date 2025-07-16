import { showToast, ToastStyle } from "../utils/toast";
import { getCredentials, showCredentialsError, validateCredentials } from "../utils/credentials";
import { clearStoredUserInfo } from "../storage/userStorage";
import { API_ENDPOINTS, DEFAULT_API_BASE_URL } from "./constants";
import { 
  structuralAnalysisService, 
  ValidationResult, 
  FunctionAnalysis,
  ClassAnalysis 
} from "../utils/structuralAnalysis";
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
  private structuralAnalysis: typeof structuralAnalysisService;
  private enableStructuralValidation: boolean = true;

  constructor() {
    // Note: Constructor cannot be async, so we'll handle credentials in makeRequest
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.apiToken = '';
    this.structuralAnalysis = structuralAnalysisService;
  }

  private async initializeCredentials(): Promise<void> {
    if (!this.apiToken) {
      const credentials = await getCredentials();
      this.baseUrl = credentials.apiBaseUrl || DEFAULT_API_BASE_URL;
      this.apiToken = credentials.apiToken;
    }
  }

  // Force refresh credentials (useful when settings are updated)
  public async refreshCredentials(): Promise<void> {
    const credentials = await getCredentials();
    this.baseUrl = credentials.apiBaseUrl || DEFAULT_API_BASE_URL;
    this.apiToken = credentials.apiToken;
  }

  // Structural Analysis Methods using Graph-Sitter

  /**
   * Enable or disable structural validation for API calls
   */
  public setStructuralValidation(enabled: boolean): void {
    this.enableStructuralValidation = enabled;
  }

  /**
   * Validate API client structure using graph-sitter Function analysis
   */
  public async validateAPIStructure(): Promise<ValidationResult> {
    if (!this.enableStructuralValidation) {
      return {
        isValid: true,
        issues: [],
        summary: {
          totalIssues: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
          filesAnalyzed: 0,
          functionsAnalyzed: 0,
          classesAnalyzed: 0
        }
      };
    }

    console.log('🔍 Validating API client structure...');
    return await this.structuralAnalysis.validateAPIUsage('src/api/client.ts');
  }

  /**
   * Get function analysis for API methods using graph-sitter Function.call_sites
   */
  public async getAPIMethodAnalysis(): Promise<FunctionAnalysis[]> {
    if (!this.enableStructuralValidation) {
      return [];
    }

    console.log('🔧 Analyzing API methods...');
    return await this.structuralAnalysis.analyzeFunctions('src/api/client.ts');
  }

  /**
   * Get class analysis for API client using graph-sitter Class.methods
   */
  public async getAPIClientAnalysis(): Promise<ClassAnalysis[]> {
    if (!this.enableStructuralValidation) {
      return [];
    }

    console.log('🏗️ Analyzing API client class...');
    return await this.structuralAnalysis.analyzeClasses('src/api/client.ts');
  }

  /**
   * Validate parameter usage in API methods
   */
  public async validateParameterUsage(): Promise<ValidationResult> {
    if (!this.enableStructuralValidation) {
      return {
        isValid: true,
        issues: [],
        summary: {
          totalIssues: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
          filesAnalyzed: 0,
          functionsAnalyzed: 0,
          classesAnalyzed: 0
        }
      };
    }

    console.log('📝 Validating API parameter usage...');
    return await this.structuralAnalysis.validateParameterUsage('src/api/client.ts');
  }

  /**
   * Get dependency graph for API client
   */
  public async getAPIDependencyGraph() {
    if (!this.enableStructuralValidation) {
      return [];
    }

    console.log('🕸️ Building API dependency graph...');
    return await this.structuralAnalysis.getDependencyGraph('src/api/client.ts');
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

    if (response.status === 429) {
      await showToast({
        style: ToastStyle.Failure,
        title: "Rate Limit Exceeded",
        message: "Please wait a moment before trying again.",
      });
      throw new Error("Rate limit exceeded");
    }

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
    agentRunId: number,
    request: Omit<ResumeAgentRunRequest, 'agent_run_id'>
  ): Promise<AgentRunResponse> {
    const fullRequest: ResumeAgentRunRequest = {
      ...request,
      agent_run_id: agentRunId,
    };
    
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_RESUME(organizationId),
      {
        method: "POST",
        body: JSON.stringify(fullRequest),
      }
    );
  }

  async stopAgentRun(
    organizationId: number,
    request: StopAgentRunRequest
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_STOP(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
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
