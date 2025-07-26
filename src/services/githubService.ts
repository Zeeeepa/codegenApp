/**
 * GitHub Service Implementation
 * 
 * This service provides GitHub API integration for repository management,
 * focusing on grainchain and codegenApp repositories as specified.
 */

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  topics: string[];
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    id: number;
    avatar_url: string;
  } | null;
  committer: {
    login: string;
    id: number;
    avatar_url: string;
  } | null;
  html_url: string;
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
    repo: GitHubRepository;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface CreateFileRequest {
  message: string;
  content: string;
  branch?: string;
  committer?: {
    name: string;
    email: string;
  };
}

export interface UpdateFileRequest {
  message: string;
  content: string;
  sha: string;
  branch?: string;
  committer?: {
    name: string;
    email: string;
  };
}

class GitHubService {
  private token: string;
  private baseUrl: string = 'https://api.github.com';
  private targetRepos: string[] = ['grainchain', 'codegenApp'];

  constructor() {
    this.token = process.env.REACT_APP_GITHUB_TOKEN || 
                 process.env.GITHUB_TOKEN || '';
    
    if (!this.token) {
      console.warn('GitHub token not found in environment variables');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API Error (${response.status}): ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * List repositories for the authenticated user
   */
  async listRepositories(options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/user/repos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<GitHubRepository[]>(endpoint);
  }

  /**
   * Get target repositories (grainchain and codegenApp)
   */
  async getTargetRepositories(): Promise<GitHubRepository[]> {
    try {
      const allRepos = await this.listRepositories({ per_page: 100 });
      return allRepos.filter(repo => 
        this.targetRepos.some(targetRepo => 
          repo.name.toLowerCase().includes(targetRepo.toLowerCase())
        )
      );
    } catch (error) {
      console.error('Failed to get target repositories:', error);
      return [];
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    owner: string, 
    repo: string, 
    path: string, 
    ref?: string
  ): Promise<GitHubFile> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
    return this.makeRequest<GitHubFile>(endpoint);
  }

  /**
   * Create a new file in repository
   */
  async createFile(
    owner: string,
    repo: string,
    path: string,
    request: CreateFileRequest
  ): Promise<{ content: GitHubFile; commit: GitHubCommit }> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    
    const body = {
      message: request.message,
      content: Buffer.from(request.content).toString('base64'),
      branch: request.branch,
      committer: request.committer,
    };

    return this.makeRequest<{ content: GitHubFile; commit: GitHubCommit }>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update an existing file in repository
   */
  async updateFile(
    owner: string,
    repo: string,
    path: string,
    request: UpdateFileRequest
  ): Promise<{ content: GitHubFile; commit: GitHubCommit }> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    
    const body = {
      message: request.message,
      content: Buffer.from(request.content).toString('base64'),
      sha: request.sha,
      branch: request.branch,
      committer: request.committer,
    };

    return this.makeRequest<{ content: GitHubFile; commit: GitHubCommit }>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete a file from repository
   */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<{ commit: GitHubCommit }> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    
    const body = {
      message,
      sha,
      branch,
    };

    return this.makeRequest<{ commit: GitHubCommit }>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  }

  /**
   * List commits for a repository
   */
  async listCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubCommit[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/repos/${owner}/${repo}/commits${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<GitHubCommit[]>(endpoint);
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    options: {
      title: string;
      head: string;
      base: string;
      body?: string;
      maintainer_can_modify?: boolean;
      draft?: boolean;
    }
  ): Promise<GitHubPullRequest> {
    const endpoint = `/repos/${owner}/${repo}/pulls`;
    
    return this.makeRequest<GitHubPullRequest>(endpoint, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubPullRequest[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/repos/${owner}/${repo}/pulls${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<GitHubPullRequest[]>(endpoint);
  }

  /**
   * Create a webhook for the repository
   */
  async createWebhook(
    owner: string,
    repo: string,
    webhookUrl: string,
    secret?: string
  ): Promise<any> {
    const endpoint = `/repos/${owner}/${repo}/hooks`;
    
    const body = {
      name: 'web',
      active: true,
      events: ['push', 'pull_request', 'pull_request_review', 'issues'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: secret,
        insecure_ssl: '0',
      },
    };

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * List webhooks for the repository
   */
  async listWebhooks(owner: string, repo: string): Promise<any[]> {
    const endpoint = `/repos/${owner}/${repo}/hooks`;
    return this.makeRequest<any[]>(endpoint);
  }

  /**
   * Test GitHub API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/user');
      return true;
    } catch (error) {
      console.error('GitHub API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get authenticated user information
   */
  async getUser(): Promise<any> {
    return this.makeRequest('/user');
  }

  /**
   * Setup webhooks for target repositories
   */
  async setupWebhooksForTargetRepos(webhookUrl: string, secret?: string): Promise<void> {
    const targetRepos = await this.getTargetRepositories();
    
    for (const repo of targetRepos) {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        
        // Check if webhook already exists
        const existingWebhooks = await this.listWebhooks(owner, repoName);
        const webhookExists = existingWebhooks.some(hook => 
          hook.config?.url === webhookUrl
        );

        if (!webhookExists) {
          await this.createWebhook(owner, repoName, webhookUrl, secret);
          console.log(`Webhook created for ${repo.full_name}`);
        } else {
          console.log(`Webhook already exists for ${repo.full_name}`);
        }
      } catch (error) {
        console.error(`Failed to setup webhook for ${repo.full_name}:`, error);
      }
    }
  }
}

// Singleton instance
let githubService: GitHubService | null = null;

export function getGitHubService(): GitHubService {
  if (!githubService) {
    githubService = new GitHubService();
  }
  return githubService;
}

export default GitHubService;

