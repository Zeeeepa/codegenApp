/**
 * AI Agent Interface Component
 * React component for interacting with AI agents
 */

import React, { useState, useEffect } from 'react';
import { 
  PMAgentAPI, 
  SchemaAgentAPI, 
  QAAgentAPI, 
  OrchestratorAPI, 
  AgentsAPI,
  type AgentStats,
  type WorkflowConfig,
  type WorkflowStatus 
} from '../api/agents';

interface AgentInterfaceProps {
  onClose?: () => void;
}

type TabType = 'overview' | 'pm' | 'schema' | 'qa' | 'orchestrator';

export const AgentInterface: React.FC<AgentInterfaceProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [agentsStatus, setAgentsStatus] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgentsData();
  }, []);

  const loadAgentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [status, stats] = await Promise.all([
        AgentsAPI.getStatus(),
        AgentsAPI.getAllStats(),
      ]);
      
      setAgentsStatus(status.data);
      setAgentStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents data');
    } finally {
      setLoading(false);
    }
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Agents Status</h3>
        
        {agentsStatus ? (
          <div className="space-y-4">
            {/* Gemini API Status */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Google Gemini API</h4>
                <p className="text-sm text-gray-300">
                  Model: {agentsStatus.geminiApi?.model || 'Not configured'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                agentsStatus.geminiApi?.configured 
                  ? 'bg-green-900 text-green-300' 
                  : 'bg-red-900 text-red-300'
              }`}>
                {agentsStatus.geminiApi?.configured ? 'Configured' : 'Not Configured'}
              </div>
            </div>

            {/* Agents Status */}
            {Object.entries(agentsStatus.agents || {}).map(([key, agent]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">{agent.description}</h4>
                  <p className="text-sm text-gray-300">
                    {agentStats?.[key]?.totalConversations || 0} conversations
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                  {agent.status}
                </div>
              </div>
            ))}

            {/* Orchestrator Status */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <h4 className="font-medium text-white">{agentsStatus.orchestrator?.description}</h4>
                <p className="text-sm text-gray-300">
                  {agentStats?.orchestrator?.totalWorkflows || 0} workflows executed
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                {agentsStatus.orchestrator?.status}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Loading agents status...</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🚀 Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setActiveTab('orchestrator')}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors"
          >
            <h4 className="font-medium">Start Workflow</h4>
            <p className="text-sm text-blue-200">Create a multi-agent workflow</p>
          </button>
          
          <button
            onClick={() => setActiveTab('pm')}
            className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-left transition-colors"
          >
            <h4 className="font-medium">Analyze Project</h4>
            <p className="text-sm text-purple-200">Get project analysis and planning</p>
          </button>
          
          <button
            onClick={() => setActiveTab('schema')}
            className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors"
          >
            <h4 className="font-medium">Design Schema</h4>
            <p className="text-sm text-green-200">Create database schema design</p>
          </button>
          
          <button
            onClick={() => setActiveTab('qa')}
            className="p-4 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-left transition-colors"
          >
            <h4 className="font-medium">Generate Queries</h4>
            <p className="text-sm text-orange-200">Create SQL queries and tests</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPMTab = () => (
    <PMAgentTab stats={agentStats?.pmAgent} />
  );

  const renderSchemaTab = () => (
    <SchemaAgentTab stats={agentStats?.schemaAgent} />
  );

  const renderQATab = () => (
    <QAAgentTab stats={agentStats?.qaAgent} />
  );

  const renderOrchestratorTab = () => (
    <OrchestratorTab stats={agentStats?.orchestrator} />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading AI Agents...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6">
            <h3 className="text-red-300 font-medium mb-2">Error Loading AI Agents</h3>
            <p className="text-red-200">{error}</p>
            <button
              onClick={loadAgentsData}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🤖 AI Agents</h1>
            <p className="text-gray-400 mt-2">
              Interact with Google Gemini-powered AI agents for project management, database design, and SQL generation
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 overflow-x-auto">
          {renderTabButton('overview', 'Overview', '📊')}
          {renderTabButton('pm', 'PM Agent', '👔')}
          {renderTabButton('schema', 'Schema Agent', '🗄️')}
          {renderTabButton('qa', 'QA Agent', '🧪')}
          {renderTabButton('orchestrator', 'Orchestrator', '🎭')}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'pm' && renderPMTab()}
          {activeTab === 'schema' && renderSchemaTab()}
          {activeTab === 'qa' && renderQATab()}
          {activeTab === 'orchestrator' && renderOrchestratorTab()}
        </div>
      </div>
    </div>
  );
};

// Individual Agent Tab Components
const PMAgentTab: React.FC<{ stats?: AgentStats }> = ({ stats }) => {
  const [requirements, setRequirements] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeProject = async () => {
    if (!requirements.trim()) return;
    
    try {
      setLoading(true);
      const projectRequirements = {
        name: 'New Project',
        description: requirements,
        objectives: [requirements],
      };
      
      const response = await PMAgentAPI.analyzeProject(projectRequirements);
      setResult(response.data);
    } catch (error) {
      console.error('PM Agent error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">👔 Project Manager Agent</h3>
        
        {stats && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Agent Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Conversations:</span>
                <div className="text-white font-medium">{stats.totalConversations}</div>
              </div>
              <div>
                <span className="text-gray-400">Avg Duration:</span>
                <div className="text-white font-medium">{Math.round(stats.avgDuration)}ms</div>
              </div>
              <div>
                <span className="text-gray-400">Model:</span>
                <div className="text-white font-medium">{stats.model}</div>
              </div>
              <div>
                <span className="text-gray-400">Last Activity:</span>
                <div className="text-white font-medium">
                  {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Requirements
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your project requirements, objectives, and constraints..."
            />
          </div>
          
          <button
            onClick={analyzeProject}
            disabled={loading || !requirements.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Project'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Analysis Result</h4>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const SchemaAgentTab: React.FC<{ stats?: AgentStats }> = ({ stats }) => {
  const [requirements, setRequirements] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const designSchema = async () => {
    if (!requirements.trim()) return;
    
    try {
      setLoading(true);
      const schemaRequirements = {
        projectName: 'New Schema',
        description: requirements,
        entities: [],
      };
      
      const response = await SchemaAgentAPI.designSchema(schemaRequirements);
      setResult(response.data);
    } catch (error) {
      console.error('Schema Agent error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🗄️ Database Schema Build Agent</h3>
        
        {stats && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Agent Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Conversations:</span>
                <div className="text-white font-medium">{stats.totalConversations}</div>
              </div>
              <div>
                <span className="text-gray-400">Avg Duration:</span>
                <div className="text-white font-medium">{Math.round(stats.avgDuration)}ms</div>
              </div>
              <div>
                <span className="text-gray-400">Model:</span>
                <div className="text-white font-medium">{stats.model}</div>
              </div>
              <div>
                <span className="text-gray-400">Last Activity:</span>
                <div className="text-white font-medium">
                  {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Schema Requirements
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your database schema requirements, entities, relationships..."
            />
          </div>
          
          <button
            onClick={designSchema}
            disabled={loading || !requirements.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {loading ? 'Designing...' : 'Design Schema'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Schema Design Result</h4>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const QAAgentTab: React.FC<{ stats?: AgentStats }> = ({ stats }) => {
  const [requirements, setRequirements] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateQueries = async () => {
    if (!requirements.trim()) return;
    
    try {
      setLoading(true);
      const queryRequirements = {
        description: requirements,
        tables: [],
        operations: ['SELECT'],
      };
      
      const response = await QAAgentAPI.generateQueries(queryRequirements);
      setResult(response.data);
    } catch (error) {
      console.error('QA Agent error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🧪 QA DDL Generation Agent</h3>
        
        {stats && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Agent Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Conversations:</span>
                <div className="text-white font-medium">{stats.totalConversations}</div>
              </div>
              <div>
                <span className="text-gray-400">Avg Duration:</span>
                <div className="text-white font-medium">{Math.round(stats.avgDuration)}ms</div>
              </div>
              <div>
                <span className="text-gray-400">Model:</span>
                <div className="text-white font-medium">{stats.model}</div>
              </div>
              <div>
                <span className="text-gray-400">Last Activity:</span>
                <div className="text-white font-medium">
                  {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Query Requirements
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what SQL queries you need, what data to retrieve, filters, joins..."
            />
          </div>
          
          <button
            onClick={generateQueries}
            disabled={loading || !requirements.trim()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Queries'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Generated Queries</h4>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const OrchestratorTab: React.FC<{ stats?: any }> = ({ stats }) => {
  const [workflowType, setWorkflowType] = useState<string>('full_database_project');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runWorkflow = async () => {
    if (!description.trim()) return;
    
    try {
      setLoading(true);
      const workflowConfig: WorkflowConfig = {
        type: workflowType as any,
        description,
        data: {
          description,
          requirements: { description }
        }
      };
      
      const response = await OrchestratorAPI.runWorkflow(workflowConfig);
      setResult(response.data);
    } catch (error) {
      console.error('Orchestrator error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🎭 Multi-Agent Workflow Orchestrator</h3>
        
        {stats && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Orchestrator Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Active Workflows:</span>
                <div className="text-white font-medium">{stats.activeWorkflows || 0}</div>
              </div>
              <div>
                <span className="text-gray-400">Completed:</span>
                <div className="text-white font-medium">{stats.completedWorkflows || 0}</div>
              </div>
              <div>
                <span className="text-gray-400">Failed:</span>
                <div className="text-white font-medium">{stats.failedWorkflows || 0}</div>
              </div>
              <div>
                <span className="text-gray-400">Total:</span>
                <div className="text-white font-medium">{stats.totalWorkflows || 0}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Workflow Type
            </label>
            <select
              value={workflowType}
              onChange={(e) => setWorkflowType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="full_database_project">Full Database Project</option>
              <option value="schema_design_only">Schema Design Only</option>
              <option value="query_generation_only">Query Generation Only</option>
              <option value="testing_only">Testing Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Workflow Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what you want the workflow to accomplish..."
            />
          </div>
          
          <button
            onClick={runWorkflow}
            disabled={loading || !description.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {loading ? 'Running Workflow...' : 'Run Workflow'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Workflow Result</h4>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentInterface;

