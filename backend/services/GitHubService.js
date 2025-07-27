/**
 * GitHub Service
 * Handles GitHub API operations for PR management
 */

import fetch from 'node-fetch';

export class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
    this.repos = process.env.GITHUB_REPOS ? process.env.GITHUB_REPOS.split(',') : [];
    
    if (!this.token) {
      console.warn('⚠️ GITHUB_TOKEN not set - GitHub integration disabled');
    }
  }

  /**
   * Check if GitHub is properly configured
   */
  isConfigured() {
    return !!this.token;
  }

  /**
   * Get headers for GitHub API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CodegenApp/1.0.0'
    };
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository information
   */
  async getRepository(owner, repo) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Getting repository info: ${owner}/${repo}`);

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const repoData = await response.json();
      console.log(`✅ Repository info retrieved: ${repoData.full_name}`);

      return {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        owner: repoData.owner.login,
        default_branch: repoData.default_branch,
        clone_url: repoData.clone_url,
        ssh_url: repoData.ssh_url,
        html_url: repoData.html_url,
        private: repoData.private,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at
      };

    } catch (error) {
      console.error('❌ GitHub repository error:', error.message);
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  /**
   * Create a pull request
   * @param {Object} params - PR parameters
   * @param {string} params.owner - Repository owner
   * @param {string} params.repo - Repository name
   * @param {string} params.title - PR title
   * @param {string} params.body - PR body
   * @param {string} params.head - Head branch
   * @param {string} params.base - Base branch
   * @returns {Promise<Object>} Created PR information
   */
  async createPullRequest({ owner, repo, title, body, head, base = 'main' }) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Creating PR: ${owner}/${repo} - ${title}`);

      const payload = {
        title,
        body,
        head,
        base,
        maintainer_can_modify: true
      };

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const prData = await response.json();
      console.log(`✅ PR created successfully: #${prData.number}`);

      return {
        id: prData.id,
        number: prData.number,
        title: prData.title,
        body: prData.body,
        state: prData.state,
        html_url: prData.html_url,
        head: {
          ref: prData.head.ref,
          sha: prData.head.sha
        },
        base: {
          ref: prData.base.ref,
          sha: prData.base.sha
        },
        created_at: prData.created_at,
        updated_at: prData.updated_at,
        mergeable: prData.mergeable,
        merged: prData.merged
      };

    } catch (error) {
      console.error('❌ GitHub PR creation error:', error.message);
      throw new Error(`Failed to create PR: ${error.message}`);
    }
  }

  /**
   * Get pull request information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - PR number
   * @returns {Promise<Object>} PR information
   */
  async getPullRequest(owner, repo, prNumber) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Getting PR info: ${owner}/${repo}#${prNumber}`);

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const prData = await response.json();
      console.log(`✅ PR info retrieved: #${prData.number} - ${prData.state}`);

      return {
        id: prData.id,
        number: prData.number,
        title: prData.title,
        body: prData.body,
        state: prData.state,
        html_url: prData.html_url,
        head: {
          ref: prData.head.ref,
          sha: prData.head.sha
        },
        base: {
          ref: prData.base.ref,
          sha: prData.base.sha
        },
        created_at: prData.created_at,
        updated_at: prData.updated_at,
        mergeable: prData.mergeable,
        merged: prData.merged,
        merge_commit_sha: prData.merge_commit_sha
      };

    } catch (error) {
      console.error('❌ GitHub PR retrieval error:', error.message);
      throw new Error(`Failed to get PR: ${error.message}`);
    }
  }

  /**
   * Get PR status checks
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Status checks information
   */
  async getPRStatusChecks(owner, repo, sha) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Getting status checks for: ${owner}/${repo}@${sha}`);

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/commits/${sha}/status`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const statusData = await response.json();
      console.log(`✅ Status checks retrieved: ${statusData.state}`);

      return {
        state: statusData.state, // pending, success, failure, error
        total_count: statusData.total_count,
        statuses: statusData.statuses.map(status => ({
          id: status.id,
          state: status.state,
          description: status.description,
          target_url: status.target_url,
          context: status.context,
          created_at: status.created_at,
          updated_at: status.updated_at
        })),
        sha: statusData.sha,
        commit_url: statusData.url
      };

    } catch (error) {
      console.error('❌ GitHub status checks error:', error.message);
      throw new Error(`Failed to get status checks: ${error.message}`);
    }
  }

  /**
   * Merge a pull request
   * @param {Object} params - Merge parameters
   * @param {string} params.owner - Repository owner
   * @param {string} params.repo - Repository name
   * @param {number} params.prNumber - PR number
   * @param {string} params.commitTitle - Merge commit title
   * @param {string} params.commitMessage - Merge commit message
   * @param {string} params.mergeMethod - Merge method (merge, squash, rebase)
   * @returns {Promise<Object>} Merge result
   */
  async mergePullRequest({ owner, repo, prNumber, commitTitle, commitMessage, mergeMethod = 'merge' }) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Merging PR: ${owner}/${repo}#${prNumber}`);

      const payload = {
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: mergeMethod
      };

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const mergeData = await response.json();
      console.log(`✅ PR merged successfully: ${mergeData.sha}`);

      return {
        sha: mergeData.sha,
        merged: mergeData.merged,
        message: mergeData.message,
        merge_method: mergeMethod,
        merged_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ GitHub PR merge error:', error.message);
      throw new Error(`Failed to merge PR: ${error.message}`);
    }
  }

  /**
   * Add comment to pull request
   * @param {Object} params - Comment parameters
   * @param {string} params.owner - Repository owner
   * @param {string} params.repo - Repository name
   * @param {number} params.prNumber - PR number
   * @param {string} params.body - Comment body
   * @returns {Promise<Object>} Comment information
   */
  async addPRComment({ owner, repo, prNumber, body }) {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please set GITHUB_TOKEN');
    }

    try {
      console.log(`🐙 Adding comment to PR: ${owner}/${repo}#${prNumber}`);

      const payload = { body };

      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
      }

      const commentData = await response.json();
      console.log(`✅ Comment added successfully: ${commentData.id}`);

      return {
        id: commentData.id,
        body: commentData.body,
        html_url: commentData.html_url,
        created_at: commentData.created_at,
        updated_at: commentData.updated_at
      };

    } catch (error) {
      console.error('❌ GitHub comment error:', error.message);
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Test GitHub API connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GitHub not configured. Please set GITHUB_TOKEN'
      };
    }

    try {
      console.log(`🐙 Testing GitHub API connection`);

      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`GitHub API test failed: ${response.status}`);
      }

      const userData = await response.json();
      console.log(`✅ GitHub API connection successful: ${userData.login}`);

      return {
        success: true,
        user: {
          login: userData.login,
          id: userData.id,
          name: userData.name,
          email: userData.email
        },
        rate_limit: {
          limit: response.headers.get('x-ratelimit-limit'),
          remaining: response.headers.get('x-ratelimit-remaining'),
          reset: response.headers.get('x-ratelimit-reset')
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ GitHub connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'GitHub',
      configured: this.isConfigured(),
      token_set: !!this.token,
      base_url: this.baseUrl,
      repos: this.repos
    };
  }
}
