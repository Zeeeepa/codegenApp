/**
 * Agent Orchestrator API Routes
 * Express routes for multi-agent workflow orchestration
 */

const express = require('express');
const AgentOrchestrator = require('../services/AgentOrchestrator');
const logger = require('../logger');

const router = express.Router();
const orchestrator = new AgentOrchestrator();

/**
 * Start a new workflow
 * POST /api/orchestrator/start-workflow
 */
router.post('/start-workflow', async (req, res) => {
  try {
    const { workflowConfig } = req.body;
    
    if (!workflowConfig || !workflowConfig.type) {
      return res.status(400).json({
        error: 'Missing required field: workflowConfig with type'
      });
    }

    logger.info('Orchestrator start workflow request', { 
      type: workflowConfig.type 
    });

    const workflow = await orchestrator.startWorkflow(workflowConfig);
    
    res.json({
      success: true,
      data: workflow,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator start workflow failed', { error: error.message });
    res.status(500).json({
      error: 'Workflow start failed',
      message: error.message
    });
  }
});

/**
 * Execute next step in workflow
 * POST /api/orchestrator/execute-step/:workflowId
 */
router.post('/execute-step/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    logger.info('Orchestrator execute step request', { workflowId });

    const result = await orchestrator.executeNextStep(workflowId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator execute step failed', { 
      error: error.message, 
      workflowId: req.params.workflowId 
    });
    res.status(500).json({
      error: 'Step execution failed',
      message: error.message
    });
  }
});

/**
 * Execute complete workflow
 * POST /api/orchestrator/execute-workflow/:workflowId
 */
router.post('/execute-workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    logger.info('Orchestrator execute workflow request', { workflowId });

    const result = await orchestrator.executeWorkflow(workflowId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator execute workflow failed', { 
      error: error.message, 
      workflowId: req.params.workflowId 
    });
    res.status(500).json({
      error: 'Workflow execution failed',
      message: error.message
    });
  }
});

/**
 * Get workflow status
 * GET /api/orchestrator/workflow-status/:workflowId
 */
router.get('/workflow-status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    logger.info('Orchestrator workflow status request', { workflowId });

    const workflow = orchestrator.getWorkflowStatus(workflowId);
    
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        workflowId
      });
    }
    
    res.json({
      success: true,
      data: workflow,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator workflow status failed', { 
      error: error.message, 
      workflowId: req.params.workflowId 
    });
    res.status(500).json({
      error: 'Workflow status retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get all active workflows
 * GET /api/orchestrator/active-workflows
 */
router.get('/active-workflows', async (req, res) => {
  try {
    logger.info('Orchestrator active workflows request');

    const workflows = orchestrator.getActiveWorkflows();
    
    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator active workflows failed', { error: error.message });
    res.status(500).json({
      error: 'Active workflows retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get workflow history
 * GET /api/orchestrator/workflow-history
 */
router.get('/workflow-history', async (req, res) => {
  try {
    logger.info('Orchestrator workflow history request');

    const history = orchestrator.getWorkflowHistory();
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator workflow history failed', { error: error.message });
    res.status(500).json({
      error: 'Workflow history retrieval failed',
      message: error.message
    });
  }
});

/**
 * Cancel workflow
 * POST /api/orchestrator/cancel-workflow/:workflowId
 */
router.post('/cancel-workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    logger.info('Orchestrator cancel workflow request', { workflowId });

    const success = orchestrator.cancelWorkflow(workflowId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Workflow not found or already completed',
        workflowId
      });
    }
    
    res.json({
      success: true,
      message: 'Workflow cancelled successfully',
      workflowId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator cancel workflow failed', { 
      error: error.message, 
      workflowId: req.params.workflowId 
    });
    res.status(500).json({
      error: 'Workflow cancellation failed',
      message: error.message
    });
  }
});

/**
 * Get agent statistics
 * GET /api/orchestrator/agent-stats
 */
router.get('/agent-stats', async (req, res) => {
  try {
    logger.info('Orchestrator agent stats request');

    const stats = orchestrator.getAgentStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator agent stats failed', { error: error.message });
    res.status(500).json({
      error: 'Agent statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get orchestrator statistics
 * GET /api/orchestrator/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Orchestrator stats request');

    const stats = orchestrator.getOrchestratorStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator stats failed', { error: error.message });
    res.status(500).json({
      error: 'Orchestrator statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * Start and execute workflow in one call
 * POST /api/orchestrator/run-workflow
 */
router.post('/run-workflow', async (req, res) => {
  try {
    const { workflowConfig } = req.body;
    
    if (!workflowConfig || !workflowConfig.type) {
      return res.status(400).json({
        error: 'Missing required field: workflowConfig with type'
      });
    }

    logger.info('Orchestrator run workflow request', { 
      type: workflowConfig.type 
    });

    // Start workflow
    const workflow = await orchestrator.startWorkflow(workflowConfig);
    
    // Execute workflow
    const result = await orchestrator.executeWorkflow(workflow.id);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator run workflow failed', { error: error.message });
    res.status(500).json({
      error: 'Workflow run failed',
      message: error.message
    });
  }
});

/**
 * Get available workflow types
 * GET /api/orchestrator/workflow-types
 */
router.get('/workflow-types', async (req, res) => {
  try {
    logger.info('Orchestrator workflow types request');

    const workflowTypes = [
      {
        type: 'full_database_project',
        name: 'Full Database Project',
        description: 'Complete database project from requirements to testing',
        steps: 10,
        agents: ['pm', 'schema', 'qa']
      },
      {
        type: 'schema_design_only',
        name: 'Schema Design Only',
        description: 'Database schema design and validation',
        steps: 3,
        agents: ['schema']
      },
      {
        type: 'query_generation_only',
        name: 'Query Generation Only',
        description: 'SQL query generation and optimization',
        steps: 3,
        agents: ['qa']
      },
      {
        type: 'testing_only',
        name: 'Testing Only',
        description: 'Test suite creation and execution',
        steps: 3,
        agents: ['qa']
      }
    ];
    
    res.json({
      success: true,
      data: workflowTypes,
      count: workflowTypes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Orchestrator workflow types failed', { error: error.message });
    res.status(500).json({
      error: 'Workflow types retrieval failed',
      message: error.message
    });
  }
});

module.exports = router;

