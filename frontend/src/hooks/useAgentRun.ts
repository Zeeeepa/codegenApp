import { useState, useCallback } from 'react';
import { codegenService } from '../services/codegen';
import { AgentRun, UseAgentRunReturn } from '../types';
import { useProjectStore } from '../store/projectStore';

export const useAgentRun = (): UseAgentRunReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addAgentRun, updateAgentRun, getProject } = useProjectStore();

  const createAgentRun = useCallback(async (projectId: string, target: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const project = getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const projectName = project.repository.name;
      const planningStatement = project.settings.planningStatement;

      // Create agent run via API
      const response = await codegenService.createAgentRun(projectName, target, planningStatement);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create agent run');
      }

      const apiRunId = response.data;

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

      // Start polling for status updates
      pollAgentRunStatus(projectId, localRunId, apiRunId);

      return localRunId;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent run');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addAgentRun, getProject]);

  const getAgentRunStatus = useCallback(async (runId: string): Promise<AgentRun> => {
    try {
      const response = await codegenService.getAgentRunStatus(runId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get agent run status');
      }

      // Convert API response to AgentRun format
      const agentRun: AgentRun = {
        id: runId,
        projectId: '', // Will be filled by caller
        target: '',    // Will be filled by caller
        status: response.data.status === 'completed' ? 'completed' : 
                response.data.status === 'failed' ? 'failed' : 'running',
        type: response.data.type,
        response: response.data.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: []
      };

      return agentRun;
    } catch (err: any) {
      setError(err.message || 'Failed to get agent run status');
      throw err;
    }
  }, []);

  const continueAgentRun = useCallback(async (runId: string, message: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await codegenService.continueAgentRun(runId, message);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to continue agent run');
      }

      // Add log entry for continuation
      // Note: This would need project context to update the store
      console.log('Agent run continued successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to continue agent run');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to poll agent run status
  const pollAgentRunStatus = useCallback(async (
    projectId: string, 
    localRunId: string, 
    apiRunId: string
  ) => {
    const pollInterval = 2000; // 2 seconds
    const maxPolls = 150; // 5 minutes max
    let pollCount = 0;

    const poll = async () => {
      try {
        pollCount++;
        
        const response = await codegenService.getAgentRunStatus(apiRunId);
        
        if (response.success && response.data) {
          const apiData = response.data;
          
          // Update local store with API response
          updateAgentRun(projectId, localRunId, {
            status: apiData.status === 'completed' ? 'completed' : 
                   apiData.status === 'failed' ? 'failed' : 'running',
            type: apiData.type,
            response: apiData.content,
            updatedAt: new Date().toISOString()
          });

          // If completed or failed, stop polling
          if (apiData.status === 'completed' || apiData.status === 'failed') {
            return;
          }

          // Continue polling if not finished and under max polls
          if (pollCount < maxPolls) {
            setTimeout(poll, pollInterval);
          } else {
            // Timeout - mark as failed
            updateAgentRun(projectId, localRunId, {
              status: 'failed',
              response: 'Agent run timed out',
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error polling agent run status:', error);
        
        // On error, try a few more times before giving up
        if (pollCount < 5) {
          setTimeout(poll, pollInterval * 2); // Longer interval on error
        } else {
          updateAgentRun(projectId, localRunId, {
            status: 'failed',
            response: 'Failed to get agent run status',
            updatedAt: new Date().toISOString()
          });
        }
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  }, [updateAgentRun]);

  return {
    createAgentRun,
    getAgentRunStatus,
    continueAgentRun,
    isLoading,
    error,
  };
};

