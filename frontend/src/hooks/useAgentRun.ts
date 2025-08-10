import { useState, useCallback } from 'react';
import { getAPIClient } from '../api/client';
import { AgentRun, UseAgentRunReturn } from '../types';
import { useProjectStore } from '../store/projectStore';

export const useAgentRun = (): UseAgentRunReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addAgentRun, updateAgentRun, getProject } = useProjectStore();
  const apiClient = getAPIClient();

  const createAgentRun = useCallback(async (projectId: string, target: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const project = getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const organizationId = parseInt(project.id.split('/')[0], 10);
      if (isNaN(organizationId)) {
        throw new Error('Invalid project ID format');
      }

      // Create agent run via API
      const response = await apiClient.createAgentRun(organizationId, { prompt: target });
      
      // Add to local store
      const localRunId = addAgentRun(projectId, {
        projectId,
        target,
        status: 'pending',
        type: 'regular',
        logs: [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Agent run created successfully'
        }]
      });

      // Update the run with the API response ID
      updateAgentRun(projectId, localRunId, { id: response.id.toString() });

      return localRunId;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent run');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addAgentRun, getProject, apiClient, updateAgentRun]);

  const getAgentRunStatus = useCallback(async (runId: string): Promise<AgentRun> => {
    throw new Error('getAgentRunStatus is not implemented in the new API client');
  }, []);

  const continueAgentRun = useCallback(async (runId: string, message: string): Promise<void> => {
    throw new Error('continueAgentRun is not implemented in the new API client');
  }, []);



  return {
    createAgentRun,
    getAgentRunStatus,
    continueAgentRun,
    isLoading,
    error,
  };
};
