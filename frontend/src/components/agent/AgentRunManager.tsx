/**
 * Agent Run Manager Component
 * 
 * This component provides a comprehensive interface for managing Codegen agent runs
 * using the real Codegen API integration.
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  ExternalLink,
  GitBranch,
  Code,
  Activity
} from 'lucide-react';
import { getAPIClient } from '../../api/client';
import { getGitHubService } from '../../services/githubService';
import { getWebEvalService } from '../../services/webEvalService';
import { getGrainchainService } from '../../services/grainchainService';
import { 
  CreateAgentRunRequest, 
  ResumeAgentRunRequest, 
  AgentRunResponse as RealAgentRunResponse 
} from '../../services/codegenService';

interface AgentRunManagerProps {
  projectId?: string;
  repository?: string;
}

interface AgentRunState {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  message: string;
  response?: {
    type: 'regular' | 'plan' | 'pr';
    content: string;
    metadata?: {
      pr_url?: string;
      branch_name?: string;
      files_changed?: string[];
    };
  };
  created_at: string;
  updated_at: string;
  progress?: number;
  current_step?: string;
}

const AgentRunManager: React.FC<AgentRunManagerProps> = ({ 
  projectId, 
  repository 
}) => {
  const [agentRuns, setAgentRuns] = useState<AgentRunState[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRunState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    running: 0
  });

  const apiClient = getAPIClient();
  const githubService = getGitHubService();
  const webEvalService = getWebEvalService();
  const grainchainService = getGrainchainService();

  useEffect(() => {
    checkConnections();
    loadAgentRuns();
    
    // Set up polling for active runs
    const interval = setInterval(() => {
      if (currentRun && (currentRun.status === 'running' || currentRun.status === 'queued')) {
        updateRunStatus(currentRun.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentRun]);

  const checkConnections = async () => {
    try {
      const [codegenConnected, githubConnected, geminiConnected, grainchainConnected] = await Promise.all([
        apiClient.testRealCodegenConnection(),
        githubService.testConnection(),
        webEvalService.testGeminiConnection(),
        grainchainService.healthCheck()
      ]);

      setIsConnected(codegenConnected && githubConnected && geminiConnected && grainchainConnected);
      
      if (!codegenConnected) console.warn('Codegen API connection failed');
      if (!githubConnected) console.warn('GitHub API connection failed');
      if (!geminiConnected) console.warn('Gemini API connection failed');
      if (!grainchainConnected) console.warn('Grainchain service connection failed');
      
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const loadAgentRuns = async () => {
    try {
      const runs = await apiClient.listRealAgentRuns({
        limit: 20,
        repository: repository
      });

      const mappedRuns: AgentRunState[] = runs.map(run => ({
        id: run.id,
        status: run.status,
        message: run.message,
        response: run.response,
        created_at: run.created_at,
        updated_at: run.updated_at,
        progress: calculateProgress(run.status),
        current_step: getCurrentStep(run.status)
      }));

      setAgentRuns(mappedRuns);
      
      // Update stats
      setStats({
        total: mappedRuns.length,
        completed: mappedRuns.filter(r => r.status === 'completed').length,
        failed: mappedRuns.filter(r => r.status === 'failed').length,
        running: mappedRuns.filter(r => r.status === 'running' || r.status === 'queued').length
      });

    } catch (error) {
      console.error('Failed to load agent runs:', error);
    }
  };

  const calculateProgress = (status: string): number => {
    switch (status) {
      case 'queued': return 10;
      case 'running': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const getCurrentStep = (status: string): string => {
    switch (status) {
      case 'queued': return 'Waiting in queue...';
      case 'running': return 'Processing request...';
      case 'completed': return 'Completed successfully';
      case 'failed': return 'Failed to complete';
      case 'cancelled': return 'Cancelled by user';
      default: return 'Unknown status';
    }
  };

  const createAgentRun = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const request: CreateAgentRunRequest = {
        message: message.trim(),
        context: {
          repository: repository,
          branch: 'main'
        },
        settings: {
          model: 'claude-3-sonnet',
          temperature: 0.7,
          max_tokens: 4000
        }
      };

      const response = await apiClient.createRealAgentRun(request);
      
      const newRun: AgentRunState = {
        id: response.id,
        status: response.status,
        message: response.message,
        response: response.response,
        created_at: response.created_at,
        updated_at: response.updated_at,
        progress: calculateProgress(response.status),
        current_step: getCurrentStep(response.status)
      };

      setCurrentRun(newRun);
      setAgentRuns(prev => [newRun, ...prev]);
      setMessage('');
      
      // If the run creates a PR, trigger validation
      if (response.response?.type === 'pr' && response.response.metadata?.pr_url) {
        await triggerValidationPipeline(response.response.metadata.pr_url);
      }

    } catch (error) {
      console.error('Failed to create agent run:', error);
      alert('Failed to create agent run: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const resumeAgentRun = async (runId: string, resumeMessage: string) => {
    setIsLoading(true);
    try {
      const request: ResumeAgentRunRequest = {
        run_id: runId,
        message: resumeMessage,
        context: {
          repository: repository,
          branch: 'main'
        }
      };

      const response = await apiClient.resumeRealAgentRun(request);
      
      const updatedRun: AgentRunState = {
        id: response.id,
        status: response.status,
        message: response.message,
        response: response.response,
        created_at: response.created_at,
        updated_at: response.updated_at,
        progress: calculateProgress(response.status),
        current_step: getCurrentStep(response.status)
      };

      setCurrentRun(updatedRun);
      setAgentRuns(prev => prev.map(run => 
        run.id === runId ? updatedRun : run
      ));

    } catch (error) {
      console.error('Failed to resume agent run:', error);
      alert('Failed to resume agent run: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRunStatus = async (runId: string) => {
    try {
      const status = await apiClient.getRealAgentRunStatus(runId);
      
      setAgentRuns(prev => prev.map(run => 
        run.id === runId 
          ? { 
              ...run, 
              status: status.status,
              progress: status.progress || calculateProgress(status.status),
              current_step: status.current_step || getCurrentStep(status.status)
            }
          : run
      ));

      if (currentRun?.id === runId) {
        setCurrentRun(prev => prev ? {
          ...prev,
          status: status.status,
          progress: status.progress || calculateProgress(status.status),
          current_step: status.current_step || getCurrentStep(status.status)
        } : null);
      }

    } catch (error) {
      console.error('Failed to update run status:', error);
    }
  };

  const cancelAgentRun = async (runId: string) => {
    try {
      const success = await apiClient.cancelRealAgentRun(runId);
      if (success) {
        setAgentRuns(prev => prev.map(run => 
          run.id === runId ? { ...run, status: 'cancelled' } : run
        ));
        
        if (currentRun?.id === runId) {
          setCurrentRun(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
      }
    } catch (error) {
      console.error('Failed to cancel agent run:', error);
    }
  };

  const triggerValidationPipeline = async (prUrl: string) => {
    try {
      console.log('Triggering validation pipeline for PR:', prUrl);
      
      // Start web evaluation
      const evalRequest = {
        url: prUrl,
        task: 'Evaluate the changes in this pull request for functionality, performance, and code quality',
        context: {
          repository: repository,
          description: 'Automated validation of PR changes'
        },
        evaluation_criteria: {
          functionality: ['Code compiles', 'Tests pass', 'No runtime errors'],
          performance: true,
          accessibility: true,
          ui_ux: true,
          security: true
        }
      };

      const evaluationId = await webEvalService.startEvaluation(evalRequest);
      console.log('Web evaluation started:', evaluationId);

      // Create sandbox for testing
      const sandboxRequest = {
        name: `validation-${Date.now()}`,
        repository: repository,
        branch: 'main',
        purpose: 'validation' as const,
        environment_variables: {
          NODE_ENV: 'test',
          CI: 'true'
        },
        ports: [3000, 8080],
        timeout_minutes: 30
      };

      const sandboxId = await grainchainService.createSandbox(sandboxRequest);
      console.log('Validation sandbox created:', sandboxId);

    } catch (error) {
      console.error('Failed to trigger validation pipeline:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <Square className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Run Manager</h1>
          <p className="text-gray-600">
            Manage Codegen AI agent runs with real-time monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <button
            onClick={loadAgentRuns}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Runs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Running</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.running}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600">Failed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
        </div>
      </div>

      {/* Create New Run */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Agent Run</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message for the AI Agent
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you want the AI agent to do..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {repository && (
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4" />
                  <span>Repository: {repository}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={createAgentRun}
              disabled={!message.trim() || isLoading || !isConnected}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Creating...' : 'Create Run'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Run */}
      {currentRun && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Run</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(currentRun.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentRun.status)}`}>
                  {currentRun.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-600">
                  {currentRun.current_step}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {currentRun.status === 'running' && (
                  <button
                    onClick={() => cancelAgentRun(currentRun.id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
                  >
                    <Square className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}
                
                <span className="text-xs text-gray-500">
                  ID: {currentRun.id}
                </span>
              </div>
            </div>
            
            {currentRun.progress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentRun.progress}%` }}
                />
              </div>
            )}
            
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700">{currentRun.message}</p>
            </div>
            
            {currentRun.response && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Response ({currentRun.response.type})
                  </span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-700">{currentRun.response.content}</p>
                </div>
                
                {currentRun.response.metadata?.pr_url && (
                  <a
                    href={currentRun.response.metadata.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Pull Request</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Runs History */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Agent Runs</h2>
        </div>
        
        <div className="divide-y">
          {agentRuns.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No agent runs found. Create your first run above.
            </div>
          ) : (
            agentRuns.map((run) => (
              <div key={run.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {run.message.substring(0, 100)}
                        {run.message.length > 100 && '...'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                      {run.status.toUpperCase()}
                    </span>
                    
                    {run.response?.metadata?.pr_url && (
                      <a
                        href={run.response.metadata.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentRunManager;
