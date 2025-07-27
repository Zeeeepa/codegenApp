import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface AgentRun {
  id: string;
  agent_id: string;
  task_type: string;
  description: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  repository_url?: string;
  branch?: string;
  files?: string[];
  result?: any;
  error?: string;
  logs?: string[];
  artifacts?: any[];
  metrics?: any;
}

interface CreateAgentRequest {
  task_type: string;
  description: string;
  repository_url?: string;
  branch?: string;
  files?: string[];
  context?: any;
  priority?: number;
  timeout_minutes?: number;
  streaming?: boolean;
  metadata?: any;
}

const TASK_TYPES = [
  { value: 'code_generation', label: 'Code Generation' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'bug_fix', label: 'Bug Fix' },
  { value: 'feature_implementation', label: 'Feature Implementation' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'testing', label: 'Testing' },
  { value: 'refactoring', label: 'Refactoring' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'custom', label: 'Custom' }
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

export const CodegenAgentManager: React.FC = () => {
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAgentRequest>({
    task_type: 'code_generation',
    description: '',
    repository_url: '',
    branch: 'main',
    files: [],
    priority: 5,
    timeout_minutes: 30,
    streaming: true
  });

  useEffect(() => {
    loadAgentRuns();
    loadSystemStatus();
    
    // Set up polling for updates
    const interval = setInterval(() => {
      loadAgentRuns();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAgentRuns = async () => {
    try {
      const response = await fetch('/api/v1/agents/runs');
      if (response.ok) {
        const runs = await response.json();
        setAgentRuns(runs);
      }
    } catch (error) {
      console.error('Failed to load agent runs:', error);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/v1/agents/status');
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const createAgentRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/agents/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          files: formData.files?.filter(f => f.trim()) || []
        }),
      });

      if (response.ok) {
        const newRun = await response.json();
        setAgentRuns(prev => [newRun, ...prev]);
        setShowCreateForm(false);
        setFormData({
          task_type: 'code_generation',
          description: '',
          repository_url: '',
          branch: 'main',
          files: [],
          priority: 5,
          timeout_minutes: 30,
          streaming: true
        });
        toast.success('Agent run created successfully!');
      } else {
        const error = await response.json();
        toast.error(`Failed to create agent run: ${error.detail}`);
      }
    } catch (error) {
      toast.error('Failed to create agent run');
      console.error('Error creating agent run:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelAgentRun = async (agentId: string) => {
    try {
      const response = await fetch(`/api/v1/agents/runs/${agentId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Agent run cancelled');
        loadAgentRuns();
      } else {
        toast.error('Failed to cancel agent run');
      }
    } catch (error) {
      toast.error('Failed to cancel agent run');
      console.error('Error cancelling agent run:', error);
    }
  };

  const viewAgentDetails = async (agentId: string) => {
    try {
      const response = await fetch(`/api/v1/agents/runs/${agentId}`);
      if (response.ok) {
        const run = await response.json();
        setSelectedRun(run);
      }
    } catch (error) {
      toast.error('Failed to load agent details');
      console.error('Error loading agent details:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Codegen Agent Manager</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Create Agent Run
          </button>
        </div>

        {/* System Status */}
        {systemStatus && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{systemStatus.total_runs}</div>
                <div className="text-sm text-gray-600">Total Runs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{systemStatus.running_runs}</div>
                <div className="text-sm text-gray-600">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{systemStatus.completed_runs}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{systemStatus.failed_runs}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{systemStatus.success_rate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${systemStatus.codegen_api_healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                Codegen API: {systemStatus.codegen_api_healthy ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create Agent Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Agent Run</h2>
            <form onSubmit={createAgentRun} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  {TASK_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                  placeholder="Describe what you want the agent to do..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                <input
                  type="url"
                  value={formData.repository_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, repository_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="https://github.com/user/repo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={formData.timeout_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeout_minutes: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="streaming"
                  checked={formData.streaming}
                  onChange={(e) => setFormData(prev => ({ ...prev, streaming: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="streaming" className="text-sm text-gray-700">Enable real-time streaming</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Agent Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agent Runs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Agent Runs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {agentRuns.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No agent runs yet. Create your first one!
            </div>
          ) : (
            agentRuns.map((run) => (
              <div key={run.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[run.status as keyof typeof STATUS_COLORS]}`}>
                        {run.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{run.task_type}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{run.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created: {formatDate(run.created_at)}</span>
                      {run.repository_url && (
                        <span>Repo: {run.repository_url.split('/').slice(-2).join('/')}</span>
                      )}
                      {run.branch && <span>Branch: {run.branch}</span>}
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(run.status)}`}
                        style={{ width: `${run.progress * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => viewAgentDetails(run.agent_id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                    {run.status === 'running' && (
                      <button
                        onClick={() => cancelAgentRun(run.agent_id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Agent Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Agent Run Details</h2>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedRun.agent_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[selectedRun.status as keyof typeof STATUS_COLORS]}`}>
                    {selectedRun.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedRun.description}</p>
              </div>

              {selectedRun.error && (
                <div>
                  <label className="block text-sm font-medium text-red-700">Error</label>
                  <p className="text-sm text-red-900 bg-red-50 p-2 rounded">{selectedRun.error}</p>
                </div>
              )}

              {selectedRun.result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedRun.result, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRun.logs && selectedRun.logs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Logs</label>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
                    {selectedRun.logs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRun.artifacts && selectedRun.artifacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Artifacts</label>
                  <div className="space-y-2">
                    {selectedRun.artifacts.map((artifact, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        <pre className="text-sm">{JSON.stringify(artifact, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
