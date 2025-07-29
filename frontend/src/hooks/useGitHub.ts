import { useState, useCallback } from 'react';
import { githubService } from '../services/github';
import { GitHubRepository, GitHubBranch, UseGitHubReturn } from '../types';

export const useGitHub = (): UseGitHubReturn => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await githubService.fetchRepositories();
      
      if (response.success && response.data) {
        setRepositories(response.data);
      } else {
        setError(response.error || 'Failed to fetch repositories');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async (repoName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [owner, repo] = repoName.split('/');
      const response = await githubService.fetchBranches(owner, repo);
      
      if (response.success && response.data) {
        setBranches(response.data);
      } else {
        setError(response.error || 'Failed to fetch branches');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupWebhook = useCallback(async (repoName: string, webhookUrl: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const [owner, repo] = repoName.split('/');
      const response = await githubService.setupWebhook(owner, repo, webhookUrl);
      
      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Failed to setup webhook');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    repositories,
    branches,
    isLoading,
    error,
    fetchRepositories,
    fetchBranches,
    setupWebhook,
  };
};

