import { useState, useCallback, useEffect } from 'react';
import { getAPIClient } from '../api/client';

export interface WebEvalRequest {
  url: string;
  task: string;
  headless?: boolean;
}

export interface GitHubPRRequest {
  git_repo: string;
  pull_request: number;
  task: string;
  headless?: boolean;
}

export interface GitHubBranchRequest {
  git_repo: string;
  branch: string;
  task: string;
  headless?: boolean;
}

export interface BrowserSetupRequest {
  url?: string;
}

export interface EvaluationResult {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any[];
  error?: string;
  metadata?: {
    url?: string;
    git_repo?: string;
    pull_request?: number;
    branch?: string;
    task?: string;
    duration?: number;
  };
  timestamp?: string;
}

export interface ActiveEvaluation {
  sessionId: string;
  url?: string;
  git_repo?: string;
  pull_request?: number;
  branch?: string;
  task: string;
  startTime: number;
  endTime?: number;
  status: string;
  duration: number;
}

export interface WebEvalHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  config: {
    timeout: number;
    maxConcurrent: number;
  };
  activeEvaluations: number;
  error?: string;
  missing?: string[];
}

export const useWebEval = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null);
  const [activeEvaluations, setActiveEvaluations] = useState<ActiveEvaluation[]>([]);
  const [health, setHealth] = useState<WebEvalHealth | null>(null);

  // Fetch active evaluations
  const fetchActiveEvaluations = useCallback(async () => {
    try {
      const apiClient = getAPIClient();
      const response = await apiClient.get('/api/web-eval/active');
      setActiveEvaluations(response.data.evaluations || []);
    } catch (err) {
      console.error('Failed to fetch active evaluations:', err);
    }
  }, []);

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      const apiClient = getAPIClient();
      const response = await apiClient.get('/api/web-eval/health');
      setHealth(response.data);
    } catch (err) {
      console.error('Failed to fetch health status:', err);
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        config: { timeout: 0, maxConcurrent: 0 },
        activeEvaluations: 0,
        error: 'Unable to connect to web-eval service'
      });
    }
  }, []);

  // Poll for updates
  useEffect(() => {
    fetchActiveEvaluations();
    fetchHealth();

    const interval = setInterval(() => {
      fetchActiveEvaluations();
      fetchHealth();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [fetchActiveEvaluations, fetchHealth]);

  // Evaluate URL
  const evaluateUrl = useCallback(async (request: WebEvalRequest): Promise<EvaluationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = getAPIClient();
      const response = await apiClient.post('/api/web-eval/evaluate', request);
      const result = response.data as EvaluationResult;
      
      setLastResult(result);
      await fetchActiveEvaluations(); // Refresh active evaluations
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to evaluate URL';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveEvaluations]);

  // Test GitHub PR
  const testGitHubPR = useCallback(async (request: GitHubPRRequest): Promise<EvaluationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = getAPIClient();
      const response = await apiClient.post('/api/web-eval/test-github-pr', request);
      const result = response.data as EvaluationResult;
      
      setLastResult(result);
      await fetchActiveEvaluations();
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to test GitHub PR';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveEvaluations]);

  // Test GitHub Branch
  const testGitHubBranch = useCallback(async (request: GitHubBranchRequest): Promise<EvaluationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = getAPIClient();
      const response = await apiClient.post('/api/web-eval/test-github-branch', request);
      const result = response.data as EvaluationResult;
      
      setLastResult(result);
      await fetchActiveEvaluations();
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to test GitHub branch';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveEvaluations]);

  // Setup browser state
  const setupBrowser = useCallback(async (request: BrowserSetupRequest): Promise<EvaluationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiClient = getAPIClient();
      const response = await apiClient.post('/api/web-eval/setup-browser', request);
      const result = response.data as EvaluationResult;
      
      setLastResult(result);
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to setup browser';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get evaluation status
  const getEvaluationStatus = useCallback(async (sessionId: string): Promise<ActiveEvaluation | null> => {
    try {
      const apiClient = getAPIClient();
      const response = await apiClient.get(`/api/web-eval/status/${sessionId}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to get status for session ${sessionId}:`, err);
      return null;
    }
  }, []);

  // Cancel evaluation
  const cancelEvaluation = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const apiClient = getAPIClient();
      await apiClient.delete(`/api/web-eval/cancel/${sessionId}`);
      await fetchActiveEvaluations(); // Refresh active evaluations
      return true;
    } catch (err) {
      console.error(`Failed to cancel evaluation ${sessionId}:`, err);
      return false;
    }
  }, [fetchActiveEvaluations]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear last result
  const clearLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    lastResult,
    activeEvaluations,
    health,

    // Actions
    evaluateUrl,
    testGitHubPR,
    testGitHubBranch,
    setupBrowser,
    getEvaluationStatus,
    cancelEvaluation,
    
    // Utilities
    fetchActiveEvaluations,
    fetchHealth,
    clearError,
    clearLastResult,

    // Computed values
    isHealthy: health?.status === 'healthy',
    canStartEvaluation: health?.status === 'healthy' && 
                      activeEvaluations.filter(e => e.status === 'running').length < (health?.config?.maxConcurrent || 0),
    runningEvaluationsCount: activeEvaluations.filter(e => e.status === 'running').length,
    maxConcurrentEvaluations: health?.config?.maxConcurrent || 0
  };
};
