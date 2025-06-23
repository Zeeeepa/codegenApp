/**
 * PMAgent API Routes
 * Express routes for Project Manager Agent operations
 */

const express = require('express');
const PMAgent = require('../agents/PMAgent');
const logger = require('../logger');

const router = express.Router();
const pmAgent = new PMAgent();

/**
 * Analyze project requirements
 * POST /api/pm-agent/analyze-project
 */
router.post('/analyze-project', async (req, res) => {
  try {
    const { requirements } = req.body;
    
    if (!requirements) {
      return res.status(400).json({
        error: 'Missing required field: requirements'
      });
    }

    logger.info('PMAgent analyze project request', { 
      requirementsKeys: Object.keys(requirements) 
    });

    const result = await pmAgent.analyzeProject(requirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent analyze project failed', { error: error.message });
    res.status(500).json({
      error: 'Project analysis failed',
      message: error.message
    });
  }
});

/**
 * Create task breakdown structure
 * POST /api/pm-agent/create-task-breakdown
 */
router.post('/create-task-breakdown', async (req, res) => {
  try {
    const { projectId, scope } = req.body;
    
    if (!projectId || !scope) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, scope'
      });
    }

    logger.info('PMAgent create task breakdown request', { projectId });

    const result = await pmAgent.createTaskBreakdown(projectId, scope);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent create task breakdown failed', { 
      error: error.message, 
      projectId: req.body.projectId 
    });
    res.status(500).json({
      error: 'Task breakdown creation failed',
      message: error.message
    });
  }
});

/**
 * Coordinate agents for project execution
 * POST /api/pm-agent/coordinate-agents
 */
router.post('/coordinate-agents', async (req, res) => {
  try {
    const { projectId, phase } = req.body;
    
    if (!projectId || !phase) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, phase'
      });
    }

    logger.info('PMAgent coordinate agents request', { projectId, phase });

    const result = await pmAgent.coordinateAgents(projectId, phase);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent coordinate agents failed', { 
      error: error.message, 
      projectId: req.body.projectId,
      phase: req.body.phase 
    });
    res.status(500).json({
      error: 'Agent coordination failed',
      message: error.message
    });
  }
});

/**
 * Get project status report
 * GET /api/pm-agent/project-status/:projectId
 */
router.get('/project-status/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info('PMAgent project status request', { projectId });

    const result = await pmAgent.getProjectStatus(projectId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent project status failed', { 
      error: error.message, 
      projectId: req.params.projectId 
    });
    res.status(500).json({
      error: 'Project status retrieval failed',
      message: error.message
    });
  }
});

/**
 * Handle project changes
 * POST /api/pm-agent/handle-changes
 */
router.post('/handle-changes', async (req, res) => {
  try {
    const { projectId, changes } = req.body;
    
    if (!projectId || !changes) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, changes'
      });
    }

    logger.info('PMAgent handle changes request', { projectId });

    const result = await pmAgent.handleProjectChanges(projectId, changes);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent handle changes failed', { 
      error: error.message, 
      projectId: req.body.projectId 
    });
    res.status(500).json({
      error: 'Project change handling failed',
      message: error.message
    });
  }
});

/**
 * Get all active projects
 * GET /api/pm-agent/projects
 */
router.get('/projects', async (req, res) => {
  try {
    logger.info('PMAgent get projects request');

    const projects = pmAgent.getActiveProjects();
    
    res.json({
      success: true,
      data: projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent get projects failed', { error: error.message });
    res.status(500).json({
      error: 'Projects retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get specific project
 * GET /api/pm-agent/projects/:projectId
 */
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info('PMAgent get project request', { projectId });

    const project = pmAgent.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        projectId
      });
    }
    
    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent get project failed', { 
      error: error.message, 
      projectId: req.params.projectId 
    });
    res.status(500).json({
      error: 'Project retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get PMAgent statistics
 * GET /api/pm-agent/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('PMAgent stats request');

    const stats = pmAgent.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent stats failed', { error: error.message });
    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * Clear PMAgent conversation history
 * POST /api/pm-agent/clear-history
 */
router.post('/clear-history', async (req, res) => {
  try {
    logger.info('PMAgent clear history request');

    pmAgent.clearHistory();
    
    res.json({
      success: true,
      message: 'Conversation history cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('PMAgent clear history failed', { error: error.message });
    res.status(500).json({
      error: 'History clearing failed',
      message: error.message
    });
  }
});

module.exports = router;

