import axios, { AxiosInstance } from 'axios';
import { AgentRun, CodegenApiResponse, ApiResponse } from '../types';

class CodegenService {
  private api: AxiosInstance;
  private orgId: string;
  private apiToken: string;

  constructor() {
    this.orgId = process.env.REACT_APP_CODEGEN_ORG_ID || '';
    this.apiToken = process.env.REACT_APP_CODEGEN_API_TOKEN || '';
    
    this.api = axios.create({
      baseURL: process.env.REACT_APP_CODEGEN_API_URL || 'https://api.codegen.com',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log('Codegen API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('Codegen API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log('Codegen API Response:', response.status, response.data);
        return response;
      },
      (error) => {
        console.error('Codegen API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a new agent run
   */
  async createAgentRun(
    projectName: string, 
    target: string, 
    planningStatement?: string
  ): Promise<ApiResponse<string>> {
    try {
      const prompt = this.buildPrompt(projectName, target, planningStatement);
      
      const response = await this.api.post('/agents/runs', {
        org_id: this.orgId,
        message: prompt,
        context: {
          project: projectName,
          target: target,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: response.data.id,
        message: 'Agent run created successfully'
      };
    } catch (error: any) {
      console.error('Error creating agent run:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create agent run'
      };
    }
  }

  /**
   * Get agent run status and results
   */
  async getAgentRunStatus(runId: string): Promise<ApiResponse<CodegenApiResponse>> {
    try {
      const response = await this.api.get(`/agents/runs/${runId}`);
      
      const agentResponse: CodegenApiResponse = {
        id: response.data.id,
        status: response.data.status,
        type: this.determineResponseType(response.data.content),
        content: response.data.content || response.data.message,
        metadata: response.data.metadata
      };

      return {
        success: true,
        data: agentResponse
      };
    } catch (error: any) {
      console.error('Error getting agent run status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get agent run status'
      };
    }
  }

  /**
   * Continue an existing agent run with additional message
   */
  async continueAgentRun(runId: string, message: string): Promise<ApiResponse<boolean>> {
    try {
      await this.api.post(`/agents/runs/${runId}/continue`, {
        message: message,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: true,
        message: 'Agent run continued successfully'
      };
    } catch (error: any) {
      console.error('Error continuing agent run:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to continue agent run'
      };
    }
  }

  /**
   * Confirm a proposed plan
   */
  async confirmPlan(runId: string, confirmMessage: string = 'Proceed'): Promise<ApiResponse<boolean>> {
    try {
      await this.api.post(`/agents/runs/${runId}/confirm`, {
        message: confirmMessage,
        action: 'confirm_plan',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: true,
        message: 'Plan confirmed successfully'
      };
    } catch (error: any) {
      console.error('Error confirming plan:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to confirm plan'
      };
    }
  }

  /**
   * Modify a proposed plan
   */
  async modifyPlan(runId: string, modifications: string): Promise<ApiResponse<boolean>> {
    try {
      await this.api.post(`/agents/runs/${runId}/modify`, {
        message: modifications,
        action: 'modify_plan',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: true,
        message: 'Plan modification submitted successfully'
      };
    } catch (error: any) {
      console.error('Error modifying plan:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to modify plan'
      };
    }
  }

  /**
   * Get agent run logs
   */
  async getAgentRunLogs(runId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get(`/agents/runs/${runId}/logs`);
      
      return {
        success: true,
        data: response.data.logs || []
      };
    } catch (error: any) {
      console.error('Error getting agent run logs:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get agent run logs'
      };
    }
  }

  /**
   * Cancel an agent run
   */
  async cancelAgentRun(runId: string): Promise<ApiResponse<boolean>> {
    try {
      await this.api.post(`/agents/runs/${runId}/cancel`);

      return {
        success: true,
        data: true,
        message: 'Agent run cancelled successfully'
      };
    } catch (error: any) {
      console.error('Error cancelling agent run:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to cancel agent run'
      };
    }
  }

  /**
   * Build the prompt for agent run
   */
  private buildPrompt(projectName: string, target: string, planningStatement?: string): string {
    let prompt = `<Project='${projectName}'>\n\n`;
    
    if (planningStatement) {
      prompt += `${planningStatement}\n\n`;
    }
    
    prompt += `Target: ${target}`;
    
    return prompt;
  }

  /**
   * Determine response type based on content
   */
  private determineResponseType(content: string): 'regular' | 'plan' | 'pr' {
    if (!content) return 'regular';
    
    const lowerContent = content.toLowerCase();
    
    // Check for PR indicators
    if (lowerContent.includes('pull request') || 
        lowerContent.includes('pr created') || 
        lowerContent.includes('github.com') && lowerContent.includes('/pull/')) {
      return 'pr';
    }
    
    // Check for plan indicators
    if (lowerContent.includes('plan:') || 
        lowerContent.includes('proposed plan') || 
        lowerContent.includes('step 1') || 
        lowerContent.includes('implementation plan')) {
      return 'plan';
    }
    
    return 'regular';
  }

  /**
   * Validate API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Codegen API configuration invalid:', error);
      return false;
    }
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/orgs/${this.orgId}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting organization info:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get organization info'
      };
    }
  }
}

export const codegenService = new CodegenService();

