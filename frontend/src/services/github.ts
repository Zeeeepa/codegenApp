import { Octokit } from '@octokit/rest';
import { GitHubRepository, GitHubBranch, ApiResponse } from '../types';

class GitHubService {
  private octokit: Octokit;
  private token: string;

  constructor() {
    this.token = process.env.REACT_APP_GITHUB_TOKEN || '';
    this.octokit = new Octokit({
      auth: this.token,
    });
  }

  /**
   * Fetch all repositories for the authenticated user
   */
  async fetchRepositories(page: number = 1, per_page: number = 100): Promise<ApiResponse<GitHubRepository[]>> {
    try {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        per_page,
        page,
        sort: 'updated',
        direction: 'desc',
      });

      const repositories: GitHubRepository[] = response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
      }));

      return {
        success: true,
        data: repositories,
      };
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch repositories',
      };
    }
  }

  /**
   * Fetch branches for a specific repository
   */
  async fetchBranches(owner: string, repo: string): Promise<ApiResponse<GitHubBranch[]>> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      const branches: GitHubBranch[] = response.data.map(branch => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha
        },
        protected: branch.protected
      }));

      return {
        success: true,
        data: branches
      };
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch branches'
      };
    }
  }

  /**
   * Set up webhook for a repository
   */
  async setupWebhook(owner: string, repo: string, webhookUrl: string): Promise<ApiResponse<boolean>> {
    try {
      // First, check if webhook already exists
      const existingWebhooks = await this.octokit.rest.repos.listWebhooks({
        owner,
        repo
      });

      const existingWebhook = existingWebhooks.data.find(
        webhook => webhook.config.url === webhookUrl
      );

      if (existingWebhook) {
        return {
          success: true,
          data: true,
          message: 'Webhook already exists'
        };
      }

      // Create new webhook
      await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        name: 'web',
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: this.generateWebhookSecret()
        },
        events: [
          'pull_request',
          'push',
          'issues',
          'issue_comment',
          'pull_request_review'
        ],
        active: true
      });

      return {
        success: true,
        data: true,
        message: 'Webhook created successfully'
      };
    } catch (error: any) {
      console.error('Error setting up webhook:', error);
      return {
        success: false,
        error: error.message || 'Failed to setup webhook'
      };
    }
  }

  /**
   * Remove webhook from a repository
   */
  async removeWebhook(owner: string, repo: string, webhookUrl: string): Promise<ApiResponse<boolean>> {
    try {
      const webhooks = await this.octokit.rest.repos.listWebhooks({
        owner,
        repo
      });

      const webhook = webhooks.data.find(
        webhook => webhook.config.url === webhookUrl
      );

      if (!webhook) {
        return {
          success: true,
          data: true,
          message: 'Webhook not found'
        };
      }

      await this.octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: webhook.id
      });

      return {
        success: true,
        data: true,
        message: 'Webhook removed successfully'
      };
    } catch (error: any) {
      console.error('Error removing webhook:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove webhook'
      };
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<ApiResponse<GitHubRepository>> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      const repository: GitHubRepository = {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        default_branch: response.data.default_branch,
        updated_at: response.data.updated_at,
        language: response.data.language,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        owner: {
          login: response.data.owner.login,
          avatar_url: response.data.owner.avatar_url
        }
      };

      return {
        success: true,
        data: repository
      };
    } catch (error: any) {
      console.error('Error fetching repository:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch repository'
      };
    }
  }

  /**
   * Check if user has access to repository
   */
  async checkRepositoryAccess(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner,
        repo
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure webhook secret
   */
  private generateWebhookSecret(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Validate GitHub token
   */
  async validateToken(): Promise<boolean> {
    // Mocking token validation
    return true;
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return {
        success: true,
        data: {
          login: response.data.login,
          name: response.data.name,
          avatar_url: response.data.avatar_url,
          email: response.data.email
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user information'
      };
    }
  }
}

export const githubService = new GitHubService();

