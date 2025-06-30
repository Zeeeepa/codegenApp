import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import fs from 'fs';
import path from 'path';

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH!;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

// Read private key from file
let privateKey: string;
try {
  const keyPath = path.resolve(process.cwd(), GITHUB_PRIVATE_KEY_PATH);
  privateKey = fs.readFileSync(keyPath, 'utf8');
} catch (error) {
  console.error('Failed to read GitHub App private key:', error);
  throw new Error('GitHub App private key not found or unreadable');
}

// Create GitHub App instance
export const githubApp = new App({
  appId: GITHUB_APP_ID,
  privateKey: privateKey,
  oauth: {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
  },
});

// Create authenticated Octokit instance for the app
export const appOctokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: GITHUB_APP_ID,
    privateKey: privateKey,
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
  },
});

// Get installation Octokit for a specific installation
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  return await githubApp.getInstallationOctokit(installationId);
}

// Get user Octokit for OAuth token
export function getUserOctokit(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// GitHub API helper functions
export class GitHubService {
  private octokit: Octokit;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  // Repository analysis
  async analyzeRepository(owner: string, repo: string) {
    try {
      const [repoData, languages, contributors, releases] = await Promise.all([
        this.octokit.repos.get({ owner, repo }),
        this.octokit.repos.listLanguages({ owner, repo }),
        this.octokit.repos.listContributors({ owner, repo, per_page: 10 }),
        this.octokit.repos.listReleases({ owner, repo, per_page: 5 }),
      ]);

      return {
        repository: repoData.data,
        languages: languages.data,
        contributors: contributors.data,
        releases: releases.data,
      };
    } catch (error) {
      console.error('Error analyzing repository:', error);
      throw error;
    }
  }

  // Get repository statistics
  async getRepositoryStats(owner: string, repo: string) {
    try {
      const [commits, pullRequests, issues] = await Promise.all([
        this.octokit.repos.getCommitActivityStats({ owner, repo }),
        this.octokit.pulls.list({ owner, repo, state: 'all', per_page: 100 }),
        this.octokit.issues.listForRepo({ owner, repo, state: 'all', per_page: 100 }),
      ]);

      return {
        commitActivity: commits.data,
        pullRequests: {
          total: pullRequests.data.length,
          open: pullRequests.data.filter(pr => pr.state === 'open').length,
          closed: pullRequests.data.filter(pr => pr.state === 'closed').length,
        },
        issues: {
          total: issues.data.length,
          open: issues.data.filter(issue => issue.state === 'open' && !issue.pull_request).length,
          closed: issues.data.filter(issue => issue.state === 'closed' && !issue.pull_request).length,
        },
      };
    } catch (error) {
      console.error('Error getting repository stats:', error);
      throw error;
    }
  }

  // Get user repositories
  async getUserRepositories(username: string, page = 1, perPage = 30) {
    try {
      const response = await this.octokit.repos.listForUser({
        username,
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      return response.data;
    } catch (error) {
      console.error('Error getting user repositories:', error);
      throw error;
    }
  }

  // Search repositories
  async searchRepositories(query: string, page = 1, perPage = 30) {
    try {
      const response = await this.octokit.search.repos({
        q: query,
        page,
        per_page: perPage,
        sort: 'stars',
        order: 'desc',
      });

      return response.data;
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw error;
    }
  }

  // Get repository content
  async getRepositoryContent(owner: string, repo: string, path = '') {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting repository content:', error);
      throw error;
    }
  }

  // Get repository README
  async getRepositoryReadme(owner: string, repo: string) {
    try {
      const response = await this.octokit.repos.getReadme({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting repository README:', error);
      throw error;
    }
  }
}

// Rate limiting helper
export class RateLimitManager {
  private static instance: RateLimitManager;
  private requests: Map<string, number[]> = new Map();

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  checkRateLimit(key: string, maxRequests = 100, windowMs = 60000): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  getRemainingRequests(key: string, maxRequests = 100, windowMs = 60000): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);
    return Math.max(0, maxRequests - validRequests.length);
  }
}

// Export default GitHub service instance
export const createGitHubService = (accessToken?: string, installationId?: number) => {
  if (accessToken) {
    return new GitHubService(getUserOctokit(accessToken));
  } else if (installationId) {
    return getInstallationOctokit(installationId).then(octokit => new GitHubService(octokit));
  } else {
    return new GitHubService(appOctokit);
  }
};

