/**
 * GitHub Service - Handles GitHub API interactions
 * Manages repository listing, webhook configuration, and PR operations
 */

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  updated_at: string;
  language: string | null;
  topics: string[];
}

export interface GitHubWebhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
    secret?: string;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
    if (!this.token) {
      console.warn('GitHub token not provided. Some operations may fail.');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GitHub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get all repositories for the authenticated user
   */
  async getRepositories(options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams({
      type: options.type || 'all',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: (options.per_page || 100).toString(),
      page: (options.page || 1).toString(),
    });

    return this.makeRequest<GitHubRepository[]>(`/user/repos?${params}`);
  }

  /**
   * Get repository details by owner and name
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * Get branches for a repository
   */
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.makeRequest<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`);
  }

  /**
   * Get pull requests for a repository
   */
  async getPullRequests(
    owner: string, 
    repo: string, 
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams({
      state: options.state || 'open',
      sort: options.sort || 'created',
      direction: options.direction || 'desc',
      per_page: (options.per_page || 30).toString(),
      page: (options.page || 1).toString(),
    });

    return this.makeRequest<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls?${params}`);
  }

  /**
   * Get webhooks for a repository
   */
  async getWebhooks(owner: string, repo: string): Promise<GitHubWebhook[]> {
    return this.makeRequest<GitHubWebhook[]>(`/repos/${owner}/${repo}/hooks`);
  }

  /**
   * Create a webhook for a repository
   */
  async createWebhook(
    owner: string, 
    repo: string, 
    webhookUrl: string, 
    events: string[] = ['pull_request', 'push'],
    secret?: string
  ): Promise<GitHubWebhook> {
    const payload = {
      name: 'web',
      active: true,
      events,
      config: {
        url: webhookUrl,
        content_type: 'json',
        ...(secret && { secret }),
      },
    };

    return this.makeRequest<GitHubWebhook>(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    owner: string, 
    repo: string, 
    hookId: number, 
    updates: Partial<{
      active: boolean;
      events: string[];
      config: {
        url: string;
        content_type: string;
        secret?: string;
      };
    }>
  ): Promise<GitHubWebhook> {
    return this.makeRequest<GitHubWebhook>(`/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.makeRequest(`/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Set up webhook for CodeGen integration
   */
  async setupCodeGenWebhook(
    owner: string, 
    repo: string, 
    cloudflareWorkerUrl: string
  ): Promise<GitHubWebhook> {
    // Check if webhook already exists
    const existingWebhooks = await this.getWebhooks(owner, repo);
    const existingWebhook = existingWebhooks.find(hook => 
      hook.config.url === cloudflareWorkerUrl
    );

    if (existingWebhook) {
      // Update existing webhook to ensure it's active and has correct events
      return this.updateWebhook(owner, repo, existingWebhook.id, {
        active: true,
        events: ['pull_request', 'push', 'issues'],
        config: {
          url: cloudflareWorkerUrl,
          content_type: 'json',
        },
      });
    }

    // Create new webhook
    return this.createWebhook(
      owner, 
      repo, 
      cloudflareWorkerUrl, 
      ['pull_request', 'push', 'issues']
    );
  }

  /**
   * Remove CodeGen webhook
   */
  async removeCodeGenWebhook(
    owner: string, 
    repo: string, 
    cloudflareWorkerUrl: string
  ): Promise<void> {
    const webhooks = await this.getWebhooks(owner, repo);
    const webhook = webhooks.find(hook => hook.config.url === cloudflareWorkerUrl);
    
    if (webhook) {
      await this.deleteWebhook(owner, repo, webhook.id);
    }
  }

  /**
   * Test GitHub API connection
   */
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const user = await this.makeRequest('/user');
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default GitHubService;

