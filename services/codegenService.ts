/**
 * CodeGen Service - Handles CodeGen API interactions
 * Manages agent runs, plan confirmations, and response processing
 */

export interface CodeGenAgentRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  prompt: string;
  response?: string;
  response_type?: 'regular' | 'plan' | 'pr';
  metadata?: {
    project?: string;
    repository?: string;
    branch?: string;
    pr_number?: number;
    plan_id?: string;
  };
  error?: string;
  logs?: string[];
}

export interface CodeGenPlan {
  id: string;
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    confidence_level: number;
    dependencies: string[];
    estimated_time?: string;
  }>;
  status: 'pending' | 'confirmed' | 'rejected' | 'executing' | 'completed';
  created_at: string;
}

export interface CodeGenResponse {
  type: 'regular' | 'plan' | 'pr';
  content: string;
  plan?: CodeGenPlan;
  pr_info?: {
    number: number;
    url: string;
    title: string;
    branch: string;
  };
  can_continue: boolean;
  suggested_actions?: string[];
}

export interface CreateAgentRunRequest {
  prompt: string;
  project_context?: string;
  repository?: string;
  branch?: string;
  planning_statement?: string;
  auto_confirm_plan?: boolean;
  metadata?: Record<string, any>;
}

export interface ResumeAgentRunRequest {
  run_id: string;
  prompt: string;
  action?: 'continue' | 'confirm_plan' | 'modify_plan';
  plan_modifications?: string;
}

class CodeGenService {
  private orgId: string;
  private apiToken: string;
  private baseUrl = 'https://api.codegen.com/v1';

  constructor(orgId?: string, apiToken?: string) {
    this.orgId = orgId || process.env.CODEGEN_ORG_ID || '';
    this.apiToken = apiToken || process.env.CODEGEN_API_TOKEN || '';
    
    if (!this.orgId || !this.apiToken) {
      console.warn('CodeGen credentials not provided. API calls will fail.');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'X-Organization-ID': this.orgId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`CodeGen API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`CodeGen API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Create a new agent run
   */
  async createAgentRun(request: CreateAgentRunRequest): Promise<CodeGenAgentRun> {
    const payload = {
      prompt: this.buildPrompt(request),
      metadata: {
        project_context: request.project_context,
        repository: request.repository,
        branch: request.branch,
        auto_confirm_plan: request.auto_confirm_plan,
        ...request.metadata,
      },
    };

    return this.makeRequest<CodeGenAgentRun>('/agents/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Resume an existing agent run
   */
  async resumeAgentRun(request: ResumeAgentRunRequest): Promise<CodeGenAgentRun> {
    const payload = {
      prompt: request.prompt,
      action: request.action || 'continue',
      ...(request.plan_modifications && { plan_modifications: request.plan_modifications }),
    };

    return this.makeRequest<CodeGenAgentRun>(`/agents/runs/${request.run_id}/resume`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get agent run details
   */
  async getAgentRun(runId: string): Promise<CodeGenAgentRun> {
    return this.makeRequest<CodeGenAgentRun>(`/agents/runs/${runId}`);
  }

  /**
   * List agent runs
   */
  async listAgentRuns(options: {
    status?: string;
    project?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ runs: CodeGenAgentRun[]; total: number }> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.project) params.append('project', options.project);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    return this.makeRequest<{ runs: CodeGenAgentRun[]; total: number }>(`/agents/runs?${params}`);
  }

  /**
   * Cancel an agent run
   */
  async cancelAgentRun(runId: string): Promise<void> {
    await this.makeRequest(`/agents/runs/${runId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Get agent run logs
   */
  async getAgentRunLogs(runId: string): Promise<string[]> {
    const response = await this.makeRequest<{ logs: string[] }>(`/agents/runs/${runId}/logs`);
    return response.logs;
  }

  /**
   * Confirm a plan
   */
  async confirmPlan(runId: string, planId: string, modifications?: string): Promise<CodeGenAgentRun> {
    const payload = {
      action: 'confirm_plan',
      plan_id: planId,
      ...(modifications && { modifications }),
    };

    return this.makeRequest<CodeGenAgentRun>(`/agents/runs/${runId}/plan/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Reject a plan
   */
  async rejectPlan(runId: string, planId: string, reason?: string): Promise<CodeGenAgentRun> {
    const payload = {
      action: 'reject_plan',
      plan_id: planId,
      ...(reason && { reason }),
    };

    return this.makeRequest<CodeGenAgentRun>(`/agents/runs/${runId}/plan/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Parse agent run response
   */
  parseResponse(agentRun: CodeGenAgentRun): CodeGenResponse {
    const response = agentRun.response || '';
    
    // Detect response type
    let type: 'regular' | 'plan' | 'pr' = 'regular';
    let plan: CodeGenPlan | undefined;
    let pr_info: any;

    // Check for plan indicators
    if (response.includes('## Plan') || response.includes('### Steps') || agentRun.metadata?.plan_id) {
      type = 'plan';
      plan = this.extractPlan(response, agentRun);
    }
    
    // Check for PR indicators
    else if (response.includes('Pull Request') || response.includes('PR #') || agentRun.metadata?.pr_number) {
      type = 'pr';
      pr_info = this.extractPRInfo(response, agentRun);
    }

    return {
      type,
      content: response,
      plan,
      pr_info,
      can_continue: agentRun.status === 'completed' && type === 'regular',
      suggested_actions: this.extractSuggestedActions(response),
    };
  }

  /**
   * Build prompt with context and planning statement
   */
  private buildPrompt(request: CreateAgentRunRequest): string {
    let prompt = '';

    // Add project context
    if (request.project_context) {
      prompt += `<Project='${request.project_context}'>\n\n`;
    }

    // Add planning statement
    if (request.planning_statement) {
      prompt += `${request.planning_statement}\n\n`;
    }

    // Add user prompt
    prompt += request.prompt;

    // Add repository context if provided
    if (request.repository) {
      prompt += `\n\nRepository: ${request.repository}`;
      if (request.branch) {
        prompt += `\nBranch: ${request.branch}`;
      }
    }

    return prompt;
  }

  /**
   * Extract plan from response
   */
  private extractPlan(response: string, agentRun: CodeGenAgentRun): CodeGenPlan | undefined {
    // This is a simplified extraction - in practice, you'd want more sophisticated parsing
    const planMatch = response.match(/## Plan\s*\n([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/);
    if (!planMatch) return undefined;

    const planContent = planMatch[1];
    const steps = this.extractSteps(planContent);

    return {
      id: agentRun.metadata?.plan_id || `plan_${agentRun.id}`,
      title: 'Generated Plan',
      description: planContent.split('\n')[0] || 'Auto-generated plan',
      steps,
      status: 'pending',
      created_at: agentRun.created_at,
    };
  }

  /**
   * Extract steps from plan content
   */
  private extractSteps(content: string): CodeGenPlan['steps'] {
    const stepRegex = /(\d+)\.\s*\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\d+\.\s*\*\*|\n---|\n\*\*|$)/g;
    const steps: CodeGenPlan['steps'] = [];
    let match;

    while ((match = stepRegex.exec(content)) !== null) {
      steps.push({
        id: `step_${match[1]}`,
        title: match[2].trim(),
        description: match[3].trim(),
        confidence_level: 8, // Default confidence
        dependencies: [],
      });
    }

    return steps;
  }

  /**
   * Extract PR information from response
   */
  private extractPRInfo(response: string, agentRun: CodeGenAgentRun): any {
    const prNumberMatch = response.match(/PR #(\d+)/);
    const prUrlMatch = response.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/);
    
    return {
      number: agentRun.metadata?.pr_number || (prNumberMatch ? parseInt(prNumberMatch[1]) : null),
      url: prUrlMatch ? prUrlMatch[0] : null,
      title: 'Generated PR',
      branch: agentRun.metadata?.branch || 'feature-branch',
    };
  }

  /**
   * Extract suggested actions from response
   */
  private extractSuggestedActions(response: string): string[] {
    const actions: string[] = [];
    
    if (response.includes('continue')) actions.push('Continue');
    if (response.includes('modify') || response.includes('change')) actions.push('Modify');
    if (response.includes('confirm') || response.includes('approve')) actions.push('Confirm');
    if (response.includes('review')) actions.push('Review');
    
    return actions;
  }

  /**
   * Test CodeGen API connection
   */
  async testConnection(): Promise<{ success: boolean; organization?: any; error?: string }> {
    try {
      const response = await this.makeRequest('/organizations/current');
      return { success: true, organization: response };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default CodeGenService;

