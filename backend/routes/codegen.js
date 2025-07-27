/**
 * Codegen API Routes
 * Handles endpoints for Codegen API integration
 */

import express from 'express';
import CodegenApiService from '../services/CodegenApiService.js';
import { WebEvalAgentService } from '../services/WebEvalAgentService.js';
import { CloudflareService } from '../services/CloudflareService.js';
import { GitHubService } from '../services/GitHubService.js';
import { GrainchainService } from '../services/GrainchainService.js';
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator.js';
import { AgentRun } from '../models/AgentRun.js';
import { ValidationPipeline } from '../models/ValidationPipeline.js';
import { Project } from '../models/Project.js';

const router = express.Router();
const codegenService = new CodegenApiService();
const webEvalService = new WebEvalAgentService();
const cloudflareService = new CloudflareService();
const githubService = new GitHubService();
const grainchainService = new GrainchainService();
const workflowOrchestrator = new WorkflowOrchestrator();

/**
 * Test Codegen API connection
 * GET /api/codegen/test
 */
router.get('/test', async (req, res) => {
  try {
    const result = await codegenService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          org_id: result.org_id,
          base_url: result.base_url,
          configured: codegenService.isConfigured()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        configured: codegenService.isConfigured()
      });
    }
  } catch (error) {
    console.error('❌ Codegen test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Create a new agent run
 * POST /api/codegen/agent-run
 */
router.post('/agent-run', async (req, res) => {
  try {
    const { projectId, prompt, context, responseType } = req.body;

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: projectId'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    // Check if Codegen API is configured
    if (!codegenService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables.'
      });
    }

    // Create agent run
    const result = await codegenService.createAgentRun({
      projectId,
      prompt,
      context: context || {},
      responseType: responseType || 'regular'
    });

    res.json({
      success: true,
      message: 'Agent run created successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Create agent run error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent run',
      details: error.message
    });
  }
});

/**
 * Resume an existing agent run
 * POST /api/codegen/agent-run/:runId/resume
 */
router.post('/agent-run/:runId/resume', async (req, res) => {
  try {
    const { runId } = req.params;
    const { instruction } = req.body;

    // Check if Codegen API is configured
    if (!codegenService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables.'
      });
    }

    // Resume agent run
    const result = await codegenService.resumeAgentRun(runId, instruction);

    res.json({
      success: true,
      message: 'Agent run resumed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Resume agent run error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to resume agent run',
      details: error.message
    });
  }
});

/**
 * Get agent run status
 * GET /api/codegen/agent-run/:runId/status
 */
router.get('/agent-run/:runId/status', async (req, res) => {
  try {
    const { runId } = req.params;

    // Check if Codegen API is configured
    if (!codegenService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables.'
      });
    }

    // Get agent run status
    const result = await codegenService.getAgentRunStatus(runId);

    res.json({
      success: true,
      message: 'Agent run status retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Get agent run status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent run status',
      details: error.message
    });
  }
});

/**
 * Create agent run for validation failure
 * POST /api/codegen/validation-fix
 */
router.post('/validation-fix', async (req, res) => {
  try {
    const { pipelineId, customPrompt } = req.body;

    // Validate required fields
    if (!pipelineId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: pipelineId'
      });
    }

    // Check if Codegen API is configured
    if (!codegenService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Codegen API not configured. Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables.'
      });
    }

    // Get validation pipeline
    const pipeline = await ValidationPipeline.findById(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: `Validation pipeline not found: ${pipelineId}`
      });
    }

    // Create agent run for validation failure
    const result = await codegenService.createAgentRunForValidationFailure(pipeline, customPrompt);

    res.json({
      success: true,
      message: 'Agent run created for validation fix',
      data: result
    });

  } catch (error) {
    console.error('❌ Create validation fix error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent run for validation fix',
      details: error.message
    });
  }
});

/**
 * Handle Codegen webhook
 * POST /api/codegen/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;

    console.log('🔔 Received Codegen webhook');

    // Handle webhook
    await codegenService.handleWebhook(webhookData);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      details: error.message
    });
  }
});

/**
 * Get all agent runs for a project
 * GET /api/codegen/projects/:projectId/agent-runs
 */
router.get('/projects/:projectId/agent-runs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    // Get agent runs
    const agentRuns = await AgentRun.findByProject(projectId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      message: 'Agent runs retrieved successfully',
      data: {
        agent_runs: agentRuns,
        project_id: projectId,
        filters: { status, limit, offset }
      }
    });

  } catch (error) {
    console.error('❌ Get agent runs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent runs',
      details: error.message
    });
  }
});

/**
 * Get agent run details
 * GET /api/codegen/agent-runs/:runId
 */
router.get('/agent-runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    // Get agent run
    const agentRun = await AgentRun.findById(runId);
    if (!agentRun) {
      return res.status(404).json({
        success: false,
        error: `Agent run not found: ${runId}`
      });
    }

    // Get related validation pipeline if exists
    let validationPipeline = null;
    if (agentRun.response_type === 'validation_fix') {
      const pipelines = await ValidationPipeline.findAll();
      validationPipeline = pipelines.find(p => p.agent_run_id === runId);
    }

    res.json({
      success: true,
      message: 'Agent run retrieved successfully',
      data: {
        agent_run: agentRun,
        validation_pipeline: validationPipeline
      }
    });

  } catch (error) {
    console.error('❌ Get agent run error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent run',
      details: error.message
    });
  }
});

/**
 * Get Codegen API configuration status
 * GET /api/codegen/config
 */
router.get('/config', async (req, res) => {
  try {
    const isConfigured = codegenService.isConfigured();
    
    res.json({
      success: true,
      message: 'Configuration status retrieved',
      data: {
        configured: isConfigured,
        has_api_key: !!process.env.CODEGEN_API_KEY,
        has_org_id: !!process.env.CODEGEN_ORG_ID,
        base_url: process.env.CODEGEN_API_BASE_URL || 'https://api.codegen.com'
      }
    });

  } catch (error) {
    console.error('❌ Get config error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration status',
      details: error.message
    });
  }
});

/**
 * Get agent run statistics
 * GET /api/codegen/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { projectId } = req.query;

    // Get agent run statistics
    const stats = await AgentRun.getStats(projectId);

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        stats,
        project_id: projectId || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Get stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

// ============================================================================
// COMPLETE WORKFLOW ORCHESTRATION ENDPOINTS
// ============================================================================

/**
 * Start autonomous workflow
 * POST /api/codegen/workflow/start
 */
router.post('/workflow/start', async (req, res) => {
  try {
    const { projectId, requirements, context } = req.body;

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: projectId'
      });
    }

    if (!requirements) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: requirements'
      });
    }

    console.log(`🚀 Starting autonomous workflow for project: ${projectId}`);
    console.log(`📋 Requirements: ${requirements}`);

    // Start autonomous workflow
    const result = await workflowOrchestrator.startAutonomousWorkflow({
      projectId,
      requirements,
      context: context || {}
    });

    res.json({
      success: true,
      message: 'Autonomous workflow started successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Start workflow error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to start autonomous workflow',
      details: error.message
    });
  }
});

/**
 * Get workflow status
 * GET /api/codegen/workflow/:workflowId/status
 */
router.get('/workflow/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;

    // Get workflow status
    const status = await workflowOrchestrator.getWorkflowStatus(workflowId);

    res.json({
      success: true,
      message: 'Workflow status retrieved successfully',
      data: status
    });

  } catch (error) {
    console.error('❌ Get workflow status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
});

/**
 * List active workflows
 * GET /api/codegen/workflows/active
 */
router.get('/workflows/active', async (req, res) => {
  try {
    // Get active workflows
    const activeWorkflows = workflowOrchestrator.getActiveWorkflows();

    res.json({
      success: true,
      message: 'Active workflows retrieved successfully',
      data: {
        workflows: activeWorkflows,
        count: activeWorkflows.length
      }
    });

  } catch (error) {
    console.error('❌ Get active workflows error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get active workflows',
      details: error.message
    });
  }
});

// ============================================================================
// SERVICE-SPECIFIC ENDPOINTS
// ============================================================================

/**
 * Test Web-Eval-Agent service
 * GET /api/codegen/web-eval/test
 */
router.get('/web-eval/test', async (req, res) => {
  try {
    const status = webEvalService.getStatus();

    res.json({
      success: true,
      message: 'Web-Eval-Agent status retrieved',
      data: status
    });

  } catch (error) {
    console.error('❌ Web-Eval-Agent test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test Web-Eval-Agent',
      details: error.message
    });
  }
});

/**
 * Validate UI with Web-Eval-Agent
 * POST /api/codegen/web-eval/validate
 */
router.post('/web-eval/validate', async (req, res) => {
  try {
    const { url, elements, projectId } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: url'
      });
    }

    // Validate UI
    const result = await webEvalService.validateUI({
      url,
      elements: elements || [],
      projectId
    });

    res.json({
      success: true,
      message: 'UI validation completed',
      data: result
    });

  } catch (error) {
    console.error('❌ UI validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to validate UI',
      details: error.message
    });
  }
});

/**
 * Test Cloudflare service
 * GET /api/codegen/cloudflare/test
 */
router.get('/cloudflare/test', async (req, res) => {
  try {
    const result = await cloudflareService.testConnection();

    res.json({
      success: result.success,
      message: result.success ? 'Cloudflare connection successful' : 'Cloudflare connection failed',
      data: result
    });

  } catch (error) {
    console.error('❌ Cloudflare test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test Cloudflare connection',
      details: error.message
    });
  }
});

/**
 * Send PR notification via Cloudflare
 * POST /api/codegen/cloudflare/pr-notification
 */
router.post('/cloudflare/pr-notification', async (req, res) => {
  try {
    const { prUrl, status, projectId, metadata } = req.body;

    if (!prUrl || !status || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prUrl, status, projectId'
      });
    }

    // Send PR notification
    const result = await cloudflareService.sendPRNotification({
      prUrl,
      status,
      projectId,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      message: 'PR notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ PR notification error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send PR notification',
      details: error.message
    });
  }
});

/**
 * Test GitHub service
 * GET /api/codegen/github/test
 */
router.get('/github/test', async (req, res) => {
  try {
    const result = await githubService.testConnection();

    res.json({
      success: result.success,
      message: result.success ? 'GitHub connection successful' : 'GitHub connection failed',
      data: result
    });

  } catch (error) {
    console.error('❌ GitHub test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test GitHub connection',
      details: error.message
    });
  }
});

/**
 * Test Grainchain service
 * GET /api/codegen/grainchain/test
 */
router.get('/grainchain/test', async (req, res) => {
  try {
    const result = await grainchainService.testService();

    res.json({
      success: result.success,
      message: result.success ? 'Grainchain service test successful' : 'Grainchain service test failed',
      data: result
    });

  } catch (error) {
    console.error('❌ Grainchain test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test Grainchain service',
      details: error.message
    });
  }
});

/**
 * Run Grainchain build validation
 * POST /api/codegen/grainchain/validate
 */
router.post('/grainchain/validate', async (req, res) => {
  try {
    const { projectId, prUrl, branch, buildConfig } = req.body;

    if (!projectId || !prUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, prUrl'
      });
    }

    // Run build validation
    const result = await grainchainService.validateBuildDeployment({
      projectId,
      prUrl,
      branch: branch || 'main',
      buildConfig: buildConfig || {}
    });

    res.json({
      success: result.overall_status === 'success',
      message: 'Build validation completed',
      data: result
    });

  } catch (error) {
    console.error('❌ Build validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to run build validation',
      details: error.message
    });
  }
});

/**
 * Get all services status
 * GET /api/codegen/services/status
 */
router.get('/services/status', async (req, res) => {
  try {
    const servicesStatus = {
      codegen: codegenService.getStatus ? codegenService.getStatus() : { configured: codegenService.isConfigured() },
      web_eval: webEvalService.getStatus(),
      cloudflare: cloudflareService.getStatus(),
      github: githubService.getStatus(),
      grainchain: grainchainService.getStatus(),
      workflow_orchestrator: workflowOrchestrator.getStatus()
    };

    res.json({
      success: true,
      message: 'Services status retrieved successfully',
      data: servicesStatus
    });

  } catch (error) {
    console.error('❌ Get services status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get services status',
      details: error.message
    });
  }
});

export default router;
