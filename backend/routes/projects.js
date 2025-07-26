/**
 * Project API routes
 */

import express from 'express';
import { Project } from '../models/Project.js';
import { AgentRun } from '../models/AgentRun.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const options = {
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortDirection: req.query.sortDirection,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const projects = await Project.findAll(options);
    
    // Add additional data for each project
    const projectsWithData = await Promise.all(
      projects.map(async (project) => {
        const projectJson = project.toJSON();
        
        // Get active agent runs count
        const activeRuns = await AgentRun.findByProject(project.id, { status: 'running' });
        projectJson.activeRunsCount = activeRuns.length;
        
        // Get settings summary
        const settings = await Project.getSettings(project.id);
        projectJson.hasRepositoryRules = !!settings.repository_rules?.value;
        projectJson.hasSetupCommands = !!settings.setup_commands?.value;
        projectJson.hasSecrets = Object.keys(settings).some(key => key.startsWith('secret_'));
        
        return projectJson;
      })
    );

    res.json({
      projects: projectsWithData,
      total: projectsWithData.length
    });
  } catch (error) {
    console.error('❌ Failed to get projects:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      message: error.message
    });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with id ${req.params.id} not found`
      });
    }

    const projectJson = project.toJSON();
    
    // Add settings
    projectJson.settings = await Project.getSettings(project.id);
    
    // Add recent agent runs
    const recentRuns = await AgentRun.findByProject(project.id, { limit: 5 });
    projectJson.recentRuns = recentRuns.map(run => run.toJSON());

    res.json(projectJson);
  } catch (error) {
    console.error('❌ Failed to get project:', error);
    res.status(500).json({
      error: 'Failed to get project',
      message: error.message
    });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const {
      id,
      name,
      fullName,
      description,
      repositoryUrl,
      defaultBranch,
      autoMergeEnabled,
      autoConfirmPlan
    } = req.body;

    if (!id || !name || !fullName || !repositoryUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'id, name, fullName, and repositoryUrl are required'
      });
    }

    // Check if project already exists
    const existingProject = await Project.findById(id);
    if (existingProject) {
      return res.status(409).json({
        error: 'Project already exists',
        message: `Project with id ${id} already exists`
      });
    }

    const projectData = {
      id,
      name,
      full_name: fullName,
      description,
      repository_url: repositoryUrl,
      default_branch: defaultBranch || 'main',
      auto_merge_enabled: autoMergeEnabled || false,
      auto_confirm_plan: autoConfirmPlan || false
    };

    const project = await Project.create(projectData);
    
    res.status(201).json({
      message: 'Project created successfully',
      project: project.toJSON()
    });
  } catch (error) {
    console.error('❌ Failed to create project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    const allowedFields = [
      'name', 'description', 'default_branch', 
      'auto_merge_enabled', 'auto_confirm_plan'
    ];

    // Only include allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert camelCase to snake_case for database
        const dbField = field === 'defaultBranch' ? 'default_branch' :
                       field === 'autoMergeEnabled' ? 'auto_merge_enabled' :
                       field === 'autoConfirmPlan' ? 'auto_confirm_plan' : field;
        updates[dbField] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'At least one valid field must be provided'
      });
    }

    const project = await Project.update(req.params.id, updates);
    
    res.json({
      message: 'Project updated successfully',
      project: project.toJSON()
    });
  } catch (error) {
    console.error('❌ Failed to update project:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Project not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to update project',
        message: error.message
      });
    }
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await Project.delete(req.params.id);
    
    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('❌ Failed to delete project:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Project not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete project',
        message: error.message
      });
    }
  }
});

// Project settings routes

// Get project settings
router.get('/:id/settings', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const settings = await Project.getSettings(req.params.id);
    res.json({ settings });
  } catch (error) {
    console.error('❌ Failed to get project settings:', error);
    res.status(500).json({
      error: 'Failed to get project settings',
      message: error.message
    });
  }
});

// Update project setting
router.put('/:id/settings/:key', async (req, res) => {
  try {
    const { value, encrypted } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        error: 'Missing value',
        message: 'Setting value is required'
      });
    }

    await Project.setSetting(req.params.id, req.params.key, value, encrypted || false);
    
    res.json({
      message: 'Setting updated successfully',
      key: req.params.key,
      value: encrypted ? '[ENCRYPTED]' : value
    });
  } catch (error) {
    console.error('❌ Failed to update project setting:', error);
    res.status(500).json({
      error: 'Failed to update project setting',
      message: error.message
    });
  }
});

// Delete project setting
router.delete('/:id/settings/:key', async (req, res) => {
  try {
    const deleted = await Project.deleteSetting(req.params.id, req.params.key);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Setting not found'
      });
    }

    res.json({
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('❌ Failed to delete project setting:', error);
    res.status(500).json({
      error: 'Failed to delete project setting',
      message: error.message
    });
  }
});

// Bulk update project settings
router.post('/:id/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid settings format',
        message: 'Settings must be an object'
      });
    }

    const results = [];
    
    for (const [key, config] of Object.entries(settings)) {
      try {
        await Project.setSetting(
          req.params.id, 
          key, 
          config.value, 
          config.encrypted || false
        );
        results.push({ key, status: 'success' });
      } catch (error) {
        results.push({ key, status: 'error', error: error.message });
      }
    }

    res.json({
      message: 'Settings update completed',
      results
    });
  } catch (error) {
    console.error('❌ Failed to bulk update project settings:', error);
    res.status(500).json({
      error: 'Failed to bulk update project settings',
      message: error.message
    });
  }
});

export default router;
