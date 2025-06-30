/**
 * GitHub App Integration
 * Handles GitHub App authentication and API interactions
 */

const { App } = require('@octokit/app');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class GitHubAppClient {
  constructor() {
    this.app = null;
    this.octokit = null;
    this.initialized = false;
    this.initializeApp();
  }

  initializeApp() {
    try {
      const appId = process.env.GITHUB_APP_ID;
      const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!appId || !privateKeyPath || !clientId || !clientSecret) {
        logger.error('Missing GitHub App configuration', {
          hasAppId: !!appId,
          hasPrivateKeyPath: !!privateKeyPath,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        });
        return;
      }

      // Read private key
      const privateKeyFullPath = path.resolve(privateKeyPath);
      if (!fs.existsSync(privateKeyFullPath)) {
        logger.error('GitHub App private key file not found', { path: privateKeyFullPath });
        return;
      }

      const privateKey = fs.readFileSync(privateKeyFullPath, 'utf8');

      // Initialize GitHub App
      this.app = new App({
        appId: parseInt(appId),
        privateKey: privateKey,
        oauth: {
          clientId: clientId,
          clientSecret: clientSecret,
        },
      });

      // Initialize Octokit for App-level operations
      this.octokit = new Octokit({
        authStrategy: this.app.octokit.auth,
      });

      this.initialized = true;
      logger.info('GitHub App initialized successfully', {
        appId: appId,
        privateKeyPath: privateKeyPath
      });

    } catch (error) {
      logger.error('Failed to initialize GitHub App', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  isInitialized() {
    return this.initialized;
  }

  /**
   * Get GitHub App installation for a repository
   */
  async getInstallation(owner, repo) {
    if (!this.initialized) {
      throw new Error('GitHub App not initialized');
    }

    try {
      const { data: installation } = await this.app.octokit.rest.apps.getRepoInstallation({
        owner,
        repo,
      });

      return installation;
    } catch (error) {
      logger.error('Failed to get installation', {
        owner,
        repo,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Octokit instance for a specific installation
   */
  async getInstallationOctokit(installationId) {
    if (!this.initialized) {
      throw new Error('GitHub App not initialized');
    }

    try {
      const octokit = await this.app.getInstallationOctokit(installationId);
      return octokit;
    } catch (error) {
      logger.error('Failed to get installation Octokit', {
        installationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner, repo, installationId) {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return repository;
    } catch (error) {
      logger.error('Failed to get repository', {
        owner,
        repo,
        installationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List repositories for an installation
   */
  async getInstallationRepositories(installationId) {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();

      return data.repositories;
    } catch (error) {
      logger.error('Failed to get installation repositories', {
        installationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze repository structure and content
   */
  async analyzeRepository(owner, repo, installationId) {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      
      // Get repository basic info
      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      // Get repository contents (root level)
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      });

      // Get recent commits
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 10,
      });

      // Get languages
      const { data: languages } = await octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      // Get pull requests
      const { data: pullRequests } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 10,
      });

      // Get issues
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 10,
      });

      return {
        repository: {
          id: repository.id,
          name: repository.name,
          full_name: repository.full_name,
          description: repository.description,
          private: repository.private,
          html_url: repository.html_url,
          clone_url: repository.clone_url,
          default_branch: repository.default_branch,
          created_at: repository.created_at,
          updated_at: repository.updated_at,
          pushed_at: repository.pushed_at,
          size: repository.size,
          stargazers_count: repository.stargazers_count,
          watchers_count: repository.watchers_count,
          forks_count: repository.forks_count,
          open_issues_count: repository.open_issues_count,
        },
        contents: contents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
        })),
        recentCommits: commits.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author,
          date: commit.commit.author.date,
        })),
        languages,
        pullRequests: pullRequests.map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          user: pr.user.login,
        })),
        issues: issues.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          user: issue.user.login,
        })),
      };

    } catch (error) {
      logger.error('Failed to analyze repository', {
        owner,
        repo,
        installationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's GitHub installations
   */
  async getUserInstallations(accessToken) {
    try {
      const userOctokit = new Octokit({
        auth: accessToken,
      });

      const { data } = await userOctokit.rest.apps.listInstallationsForAuthenticatedUser();
      return data.installations;
    } catch (error) {
      logger.error('Failed to get user installations', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create OAuth URL for GitHub App installation
   */
  getInstallationUrl(state = null) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const baseUrl = 'https://github.com/apps/zeeeepa/installations/new';
    
    if (state) {
      return `${baseUrl}?state=${encodeURIComponent(state)}`;
    }
    
    return baseUrl;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCodeForToken(code, state = null) {
    try {
      const { data } = await this.app.oauth.createToken({
        code,
        state,
      });

      return data;
    } catch (error) {
      logger.error('Failed to exchange code for token', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
const gitHubAppClient = new GitHubAppClient();
module.exports = gitHubAppClient;
