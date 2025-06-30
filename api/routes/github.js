/**
 * GitHub API Routes
 * Handles GitHub App API endpoints for repository analysis and management
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const gitHubAppClient = require('../github-app');
const { requireAuth } = require('../auth/github-oauth');

/**
 * Get GitHub App status and configuration
 */
router.get('/status', (req, res) => {
  try {
    const isInitialized = gitHubAppClient.isInitialized();
    const appId = process.env.GITHUB_APP_ID;
    const clientId = process.env.GITHUB_CLIENT_ID;
    
    res.json({
      success: true,
      initialized: isInitialized,
      appId: appId,
      clientId: clientId,
      installationUrl: gitHubAppClient.getInstallationUrl()
    });
  } catch (error) {
    logger.error('GitHub status endpoint error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get GitHub App status'
    });
  }
});

/**
 * Get user's GitHub installations
 */
router.get('/installations', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'User access token not available'
      });
    }

    const installations = await gitHubAppClient.getUserInstallations(user.accessToken);
    
    res.json({
      success: true,
      installations: installations.map(installation => ({
        id: installation.id,
        account: {
          login: installation.account.login,
          type: installation.account.type,
          avatar_url: installation.account.avatar_url
        },
        repository_selection: installation.repository_selection,
        created_at: installation.created_at,
        updated_at: installation.updated_at
      }))
    });

  } catch (error) {
    logger.error('Get installations error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get installations'
    });
  }
});

/**
 * Get repositories for a specific installation
 */
router.get('/installations/:installationId/repositories', requireAuth, async (req, res) => {
  try {
    const { installationId } = req.params;
    
    const repositories = await gitHubAppClient.getInstallationRepositories(installationId);
    
    res.json({
      success: true,
      repositories: repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
        language: repo.language,
        size: repo.size,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at
      }))
    });

  } catch (error) {
    logger.error('Get installation repositories error', {
      installationId: req.params.installationId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get installation repositories'
    });
  }
});

/**
 * Analyze a specific repository
 */
router.get('/repositories/:owner/:repo/analyze', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { installationId } = req.query;
    
    if (!installationId) {
      return res.status(400).json({
        success: false,
        error: 'Installation ID is required'
      });
    }

    logger.info('Analyzing repository', {
      owner,
      repo,
      installationId,
      userId: req.user.id
    });

    const analysis = await gitHubAppClient.analyzeRepository(owner, repo, installationId);
    
    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Repository analysis error', {
      owner: req.params.owner,
      repo: req.params.repo,
      installationId: req.query.installationId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze repository'
    });
  }
});

/**
 * Get repository information
 */
router.get('/repositories/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { installationId } = req.query;
    
    if (!installationId) {
      return res.status(400).json({
        success: false,
        error: 'Installation ID is required'
      });
    }

    const repository = await gitHubAppClient.getRepository(owner, repo, installationId);
    
    res.json({
      success: true,
      repository: {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        description: repository.description,
        private: repository.private,
        html_url: repository.html_url,
        clone_url: repository.clone_url,
        default_branch: repository.default_branch,
        language: repository.language,
        size: repository.size,
        stargazers_count: repository.stargazers_count,
        watchers_count: repository.watchers_count,
        forks_count: repository.forks_count,
        open_issues_count: repository.open_issues_count,
        created_at: repository.created_at,
        updated_at: repository.updated_at,
        pushed_at: repository.pushed_at,
        owner: {
          login: repository.owner.login,
          type: repository.owner.type,
          avatar_url: repository.owner.avatar_url
        }
      }
    });

  } catch (error) {
    logger.error('Get repository error', {
      owner: req.params.owner,
      repo: req.params.repo,
      installationId: req.query.installationId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get repository information'
    });
  }
});

/**
 * Create a Codegen agent run for a repository
 */
router.post('/repositories/:owner/:repo/agent-run', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { installationId, prompt, organizationId } = req.body;
    
    if (!installationId || !prompt || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Installation ID, prompt, and organization ID are required'
      });
    }

    logger.info('Creating agent run for repository', {
      owner,
      repo,
      installationId,
      organizationId,
      promptLength: prompt.length,
      userId: req.user.id
    });

    // Get repository information first
    const repository = await gitHubAppClient.getRepository(owner, repo, installationId);
    
    // Here you would integrate with the existing Codegen API
    // For now, we'll return a placeholder response
    const agentRunData = {
      repository: {
        owner,
        repo,
        full_name: repository.full_name,
        clone_url: repository.clone_url,
        default_branch: repository.default_branch
      },
      prompt,
      organizationId,
      installationId,
      userId: req.user.id,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Agent run creation initiated',
      data: agentRunData
    });

  } catch (error) {
    logger.error('Create agent run error', {
      owner: req.params.owner,
      repo: req.params.repo,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create agent run'
    });
  }
});

/**
 * Get GitHub App installation URL
 */
router.get('/install', (req, res) => {
  try {
    const { state } = req.query;
    const installationUrl = gitHubAppClient.getInstallationUrl(state);
    
    res.json({
      success: true,
      installationUrl
    });
  } catch (error) {
    logger.error('Get installation URL error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get installation URL'
    });
  }
});

/**
 * Health check for GitHub integration
 */
router.get('/health', (req, res) => {
  try {
    const isInitialized = gitHubAppClient.isInitialized();
    const hasPrivateKey = !!process.env.GITHUB_PRIVATE_KEY_PATH;
    const hasAppId = !!process.env.GITHUB_APP_ID;
    const hasClientCredentials = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    
    const healthy = isInitialized && hasPrivateKey && hasAppId && hasClientCredentials;
    
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      checks: {
        initialized: isInitialized,
        hasPrivateKey,
        hasAppId,
        hasClientCredentials
      }
    });
  } catch (error) {
    logger.error('GitHub health check error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

module.exports = router;
