/**
 * Real Codegen API Service Implementation
 * 
 * This service implements the actual Codegen API integration using the official endpoints:
 * - create-agent-run: https://docs.codegen.com/api-reference/agents/create-agent-run
 * - resume-agent-run: https://docs.codegen.com/api-reference/agents/resume-agent-run
 */

import { getCredentials } from '../utils/credentials';

// API Types based on official Codegen API documentation
export interface CreateAgentRunRequest {
  message: string;
  agent_id?: string;
  context?: {
    repository?: string;
    branch?: string;
    files?: string[];
  };
  settings?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
}

export interface ResumeAgentRunRequest {
  run_id: string;
  message: string;
  context?: {
    repository?: string;
    branch?: string;
    files?: string[];
  };
}

export interface AgentRunResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  message: string;
  response?: {
    type: 'regular' | 'plan' | 'pr';
    content: string;
    metadata?: {
      pr_url?: string;
      branch_name?: string;
      files_changed?: string[];
      plan_steps?: Array<{
        title: string;
        description: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
      }>;
    };
  };
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
}

export interface AgentRunStatus {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  current_step?: string;
  estimated_completion?: string;
}

class CodegenAPIService {
  private baseUrl: string;
  private apiKey: string;
  private orgId: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_CODEGEN_API_BASE_URL || 'https://api.codegen.com';
    this.apiKey = process.env.REACT_APP_CODEGEN_API_KEY || '';
    this.orgId = process.env.REACT_APP_CODEGEN_ORG_ID || '';
  }

  private async getHeaders(): Promise<Record<string, string>> {
    // Try to get credentials from the credentials system first
    try {
      const credentials = await getCredentials();
      return {
        'Authorization': `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
        'X-Organization-ID': this.orgId,
      };
    } catch (error) {
      // Fallback to environment variables
      return {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Organization-ID': this.orgId,
      };
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Codegen API Error (${response.status}): ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Create a new agent run using the official Codegen API
   * 
   * @param request - The agent run request
   * @returns Promise<AgentRunResponse>
   */
  async createAgentRun(request: CreateAgentRunRequest): Promise<AgentRunResponse> {
    console.log('Creating agent run with Codegen API:', request);
    
    try {
      const response = await this.makeRequest<AgentRunResponse>('/api/v1/agents/runs', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      console.log('Agent run created successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to create agent run:', error);
      throw error;
    }
  }

  /**
   * Resume an existing agent run using the official Codegen API
   * 
   * @param request - The resume request
   * @returns Promise<AgentRunResponse>
   */
  async resumeAgentRun(request: ResumeAgentRunRequest): Promise<AgentRunResponse> {
    console.log('Resuming agent run with Codegen API:', request);
    
    try {
      const response = await this.makeRequest<AgentRunResponse>(
        `/api/v1/agents/runs/${request.run_id}/resume`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: request.message,
            context: request.context,
          }),
        }
      );

      console.log('Agent run resumed successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to resume agent run:', error);
      throw error;
    }
  }

  /**
   * Get the status of an agent run
   * 
   * @param runId - The run ID
   * @returns Promise<AgentRunStatus>
   */
  async getAgentRunStatus(runId: string): Promise<AgentRunStatus> {
    try {
      const response = await this.makeRequest<AgentRunStatus>(
        `/api/v1/agents/runs/${runId}/status`
      );

      return response;
    } catch (error) {
      console.error('Failed to get agent run status:', error);
      throw error;
    }
  }

  /**
   * Get full details of an agent run
   * 
   * @param runId - The run ID
   * @returns Promise<AgentRunResponse>
   */
  async getAgentRun(runId: string): Promise<AgentRunResponse> {
    try {
      const response = await this.makeRequest<AgentRunResponse>(
        `/api/v1/agents/runs/${runId}`
      );

      return response;
    } catch (error) {
      console.error('Failed to get agent run:', error);
      throw error;
    }
  }

  /**
   * Cancel an agent run
   * 
   * @param runId - The run ID
   * @returns Promise<boolean>
   */
  async cancelAgentRun(runId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/v1/agents/runs/${runId}/cancel`, {
        method: 'POST',
      });

      return true;
    } catch (error) {
      console.error('Failed to cancel agent run:', error);
      return false;
    }
  }

  /**
   * List agent runs for the organization
   * 
   * @param options - Query options
   * @returns Promise<AgentRunResponse[]>
   */
  async listAgentRuns(options: {
    limit?: number;
    offset?: number;
    status?: string;
    repository?: string;
  } = {}): Promise<AgentRunResponse[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.status) queryParams.append('status', options.status);
      if (options.repository) queryParams.append('repository', options.repository);

      const endpoint = `/api/v1/agents/runs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{ runs: AgentRunResponse[] }>(endpoint);
      return response.runs || [];
    } catch (error) {
      console.error('Failed to list agent runs:', error);
      throw error;
    }
  }

  /**
   * Test the API connection
   * 
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/api/v1/health');
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let codegenService: CodegenAPIService | null = null;

export function getCodegenService(): CodegenAPIService {
  if (!codegenService) {
    codegenService = new CodegenAPIService();
  }
  return codegenService;
}

export default CodegenAPIService;
