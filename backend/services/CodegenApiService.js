/**
 * Codegen API Service
 * Handles integration with Codegen API for agent runs
 */

import fetch from 'node-fetch';
import { AgentRun } from '../models/AgentRun.js';
import { ValidationPipeline } from '../models/ValidationPipeline.js';
import { Project } from '../models/Project.js';

export class CodegenApiService {
  constructor() {
    this.apiKey = process.env.CODEGEN_API_KEY;
    this.orgId = process.env.CODEGEN_ORG_ID;
    this.baseUrl = process.env.CODEGEN_API_BASE_URL || 'https://api.codegen.com';
    
    if (!this.apiKey) {
      console.warn('⚠️ CODEGEN_API_KEY not set - Codegen API integration disabled');
    }
    
    if (!this.orgId) {
      console.warn('⚠️ CODEGEN_ORG_ID not set - Codegen API integration disabled');
    }
  }

  /**
   * Check if Codegen API is properly configured
   */
  isConfigured() {
    return !!(this.apiKey && this.orgId);
  }

  /**
   * Create headers for API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CodegenApp/1.0.0'
    };
  }

  /**
   * Create a new agent run via Codegen API
   * @param {Object} params - Agent run parameters
   * @param {string} params.projectId - Project ID
   * @param {string} params.prompt - The prompt/instruction for the agent
   * @param {Object} params.context - Additional context for the agent
   * @param {string} params.responseType - Type of response expected
   * @returns {Promise<Object>} Agent run response
   */
  async createAgentRun({ projectId, prompt, context = {}, responseType = 'regular' }) {
    if (!this.isConfigured()) {
      throw new Error('Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID');
    }

    try {
      // Get project details
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create local agent run record first
      const agentRunData = {
        project_id: projectId,
        target_text: prompt,
        response_type: responseType,
        status: 'pending'
      };

      const localAgentRun = await AgentRun.create(agentRunData);
      console.log(`🤖 Created local agent run: ${localAgentRun.id} for project ${projectId}`);

      // Prepare request payload for Codegen API
      const payload = {
        prompt: prompt,
        context: {
          ...context,
          project_id: projectId,
          project_name: project.name,
          repository_url: project.repository_url,
          default_branch: project.default_branch,
          local_agent_run_id: localAgentRun.id,
          webhook_url: project.webhook_url,
          auto_merge_enabled: project.auto_merge_enabled,
          auto_confirm_plan: project.auto_confirm_plan
        }
      };

      // Make API call to Codegen
      const url = `${this.baseUrl}/v1/organizations/${this.orgId}/agent/run`;
      console.log(`🚀 Creating Codegen agent run: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Codegen API error:', responseData);
        
        // Update local record with error
        await AgentRun.update(localAgentRun.id, {
          status: 'failed',
          error_message: `Codegen API error: ${responseData.message || 'Unknown error'}`,
          response_data: responseData
        });

        throw new Error(`Codegen API error: ${responseData.message || 'Unknown error'}`);
      }

      // Update local record with Codegen response
      await AgentRun.update(localAgentRun.id, {
        status: 'running',
        current_step: 'agent_processing',
        response_data: {
          codegen_run_id: responseData.id,
          codegen_status: responseData.status,
          created_at: responseData.created_at
        }
      });

      console.log(`✅ Codegen agent run created: ${responseData.id}`);
      console.log(`🔗 Local agent run updated: ${localAgentRun.id}`);

      return {
        local_run_id: localAgentRun.id,
        codegen_run_id: responseData.id,
        status: responseData.status,
        created_at: responseData.created_at,
        response: responseData
      };

    } catch (error) {
      console.error('❌ Failed to create Codegen agent run:', error.message);
      throw error;
    }
  }

  /**
   * Resume an existing agent run via Codegen API
   * @param {string} codegenRunId - Codegen run ID to resume
   * @param {string} instruction - Additional instruction for resuming
   * @returns {Promise<Object>} Resume response
   */
  async resumeAgentRun(codegenRunId, instruction = null) {
    if (!this.isConfigured()) {
      throw new Error('Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID');
    }

    try {
      const payload = {};
      if (instruction) {
        payload.instruction = instruction;
      }

      const url = `${this.baseUrl}/v1/organizations/${this.orgId}/agent/run/${codegenRunId}/resume`;
      console.log(`▶️ Resuming Codegen agent run: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Codegen API resume error:', responseData);
        throw new Error(`Codegen API resume error: ${responseData.message || 'Unknown error'}`);
      }

      console.log(`✅ Codegen agent run resumed: ${codegenRunId}`);

      return {
        codegen_run_id: codegenRunId,
        status: responseData.status,
        resumed_at: responseData.resumed_at || new Date().toISOString(),
        response: responseData
      };

    } catch (error) {
      console.error('❌ Failed to resume Codegen agent run:', error.message);
      throw error;
    }
  }

  /**
   * Get status of a Codegen agent run
   * @param {string} codegenRunId - Codegen run ID
   * @returns {Promise<Object>} Status response
   */
  async getAgentRunStatus(codegenRunId) {
    if (!this.isConfigured()) {
      throw new Error('Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID');
    }

    try {
      const url = `${this.baseUrl}/v1/organizations/${this.orgId}/agent/run/${codegenRunId}`;
      console.log(`📊 Getting Codegen agent run status: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Codegen API status error:', responseData);
        throw new Error(`Codegen API status error: ${responseData.message || 'Unknown error'}`);
      }

      return {
        codegen_run_id: codegenRunId,
        status: responseData.status,
        progress: responseData.progress,
        current_step: responseData.current_step,
        response: responseData
      };

    } catch (error) {
      console.error('❌ Failed to get Codegen agent run status:', error.message);
      throw error;
    }
  }

  /**
   * Create agent run for validation pipeline failure
   * @param {Object} pipeline - ValidationPipeline instance
   * @param {string} customPrompt - Optional custom prompt
   * @returns {Promise<Object>} Agent run response
   */
  async createAgentRunForValidationFailure(pipeline, customPrompt = null) {
    try {
      const project = await Project.findById(pipeline.project_id);
      if (!project) {
        throw new Error(`Project not found: ${pipeline.project_id}`);
      }

      // Parse validation results
      let validationResults = {};
      if (pipeline.validation_results) {
        try {
          validationResults = typeof pipeline.validation_results === 'string' 
            ? JSON.parse(pipeline.validation_results) 
            : pipeline.validation_results;
        } catch (error) {
          console.warn('⚠️ Failed to parse validation results:', error.message);
        }
      }

      // Generate prompt based on validation failure
      const prompt = customPrompt || this.generateValidationFailurePrompt(pipeline, validationResults);

      // Create context with validation details
      const context = {
        validation_pipeline_id: pipeline.id,
        pull_request_id: pipeline.pull_request_id,
        pull_request_url: pipeline.pull_request_url,
        deployment_url: pipeline.deployment_url,
        validation_failure: {
          status: pipeline.status,
          error_message: pipeline.error_message,
          current_step: pipeline.current_step,
          progress_percentage: pipeline.progress_percentage,
          validation_results: validationResults
        },
        repository_context: {
          default_branch: project.default_branch,
          repository_url: project.repository_url,
          auto_merge_enabled: project.auto_merge_enabled
        }
      };

      // Create agent run
      const result = await this.createAgentRun({
        projectId: pipeline.project_id,
        prompt: prompt,
        context: context,
        responseType: 'validation_fix'
      });

      // Link agent run to validation pipeline
      await ValidationPipeline.update(pipeline.id, {
        agent_run_id: result.local_run_id
      });

      console.log(`🔗 Linked agent run ${result.local_run_id} to validation pipeline ${pipeline.id}`);

      return result;

    } catch (error) {
      console.error('❌ Failed to create agent run for validation failure:', error.message);
      throw error;
    }
  }

  /**
   * Generate a prompt for validation failure
   * @param {Object} pipeline - ValidationPipeline instance
   * @param {Object} validationResults - Parsed validation results
   * @returns {string} Generated prompt
   */
  generateValidationFailurePrompt(pipeline, validationResults) {
    let prompt = `Fix the validation failure in this pull request.

**Pull Request:** ${pipeline.pull_request_url}
**Current Status:** ${pipeline.status}
**Failed Step:** ${pipeline.current_step}
**Progress:** ${pipeline.progress_percentage}%`;

    if (pipeline.error_message) {
      prompt += `\n**Error Message:** ${pipeline.error_message}`;
    }

    if (pipeline.deployment_url) {
      prompt += `\n**Deployment URL:** ${pipeline.deployment_url}`;
    }

    if (validationResults && validationResults.stages) {
      prompt += '\n\n**Validation Stages:**';
      Object.entries(validationResults.stages).forEach(([stage, result]) => {
        const status = result.status === 'success' ? '✅' : '❌';
        prompt += `\n- ${status} ${stage}`;
        if (result.error) {
          prompt += `: ${result.error}`;
        }
        if (result.duration) {
          prompt += ` (${result.duration}ms)`;
        }
      });
    }

    prompt += '\n\nPlease analyze the failure and implement the necessary fixes to make the validation pass.';

    return prompt;
  }

  /**
   * Handle webhook from Codegen API
   * @param {Object} webhookData - Webhook payload
   * @returns {Promise<void>}
   */
  async handleWebhook(webhookData) {
    try {
      console.log('🔔 Received Codegen webhook:', JSON.stringify(webhookData, null, 2));

      const { run_id, status, progress, current_step, error_message, result } = webhookData;

      if (!run_id) {
        console.warn('⚠️ Webhook missing run_id');
        return;
      }

      // Find local agent run by Codegen run ID
      const agentRuns = await AgentRun.findAll();
      const localAgentRun = agentRuns.find(run => {
        if (run.response_data && typeof run.response_data === 'object') {
          return run.response_data.codegen_run_id === run_id;
        }
        return false;
      });

      if (!localAgentRun) {
        console.warn(`⚠️ No local agent run found for Codegen run ID: ${run_id}`);
        return;
      }

      // Update local agent run
      const updates = {
        status: status || localAgentRun.status,
        current_step: current_step || localAgentRun.current_step,
        progress_percentage: progress !== undefined ? progress : localAgentRun.progress_percentage
      };

      if (error_message) {
        updates.error_message = error_message;
      }

      if (result) {
        updates.response_data = {
          ...localAgentRun.response_data,
          result: result,
          updated_at: new Date().toISOString()
        };
      }

      await AgentRun.update(localAgentRun.id, updates);
      console.log(`✅ Updated local agent run ${localAgentRun.id} from webhook`);

      // If agent run is completed, update related validation pipeline
      if (status === 'completed' || status === 'failed') {
        await this.updateValidationPipelineFromAgentRun(localAgentRun.id, status, result);
      }

    } catch (error) {
      console.error('❌ Failed to handle Codegen webhook:', error.message);
      throw error;
    }
  }

  /**
   * Update validation pipeline based on agent run completion
   * @param {string} agentRunId - Local agent run ID
   * @param {string} status - Agent run status
   * @param {Object} result - Agent run result
   * @returns {Promise<void>}
   */
  async updateValidationPipelineFromAgentRun(agentRunId, status, result) {
    try {
      // Find validation pipeline linked to this agent run
      const pipelines = await ValidationPipeline.findAll();
      const pipeline = pipelines.find(p => p.agent_run_id === agentRunId);

      if (!pipeline) {
        console.log(`ℹ️ No validation pipeline found for agent run ${agentRunId}`);
        return;
      }

      if (status === 'completed' && result) {
        // Agent run completed successfully
        await pipeline.setStatus('completed', null);
        await pipeline.updateProgress(100, 'agent_fix_completed');
        
        if (result.pull_request_url) {
          console.log(`✅ Agent completed fix for PR: ${result.pull_request_url}`);
        }
      } else if (status === 'failed') {
        // Agent run failed
        await pipeline.setStatus('failed', 'Agent run failed to fix the validation issues');
        console.log(`❌ Agent failed to fix validation pipeline ${pipeline.id}`);
      }

    } catch (error) {
      console.error('❌ Failed to update validation pipeline from agent run:', error.message);
    }
  }

  /**
   * Test the Codegen API connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID'
      };
    }

    try {
      // Test with a simple API call (assuming there's a health check endpoint)
      const url = `${this.baseUrl}/v1/organizations/${this.orgId}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Codegen API connection successful',
          org_id: this.orgId,
          base_url: this.baseUrl
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `API returned ${response.status}: ${errorData.message || 'Unknown error'}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`
      };
    }
  }
}

export default CodegenApiService;
