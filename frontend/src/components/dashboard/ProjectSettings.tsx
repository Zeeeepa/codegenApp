import React, { useState } from 'react';
import { X, Save, Play, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { ProjectSettingsProps, SecretsFormData } from '../../types';
import { useGitHub } from '../../hooks';

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  isOpen,
  onClose,
  project,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('rules');
  const [settings, setSettings] = useState(project.settings);
  const [newSecret, setNewSecret] = useState<SecretsFormData>({ envVarName: '', value: '' });
  const [showSecretValues, setShowSecretValues] = useState<Record<string, boolean>>({});
  const [secretsText, setSecretsText] = useState('');
  const [secretsMode, setSecretsMode] = useState<'form' | 'text'>('form');
  
  const { branches, fetchBranches } = useGitHub();

  React.useEffect(() => {
    if (isOpen) {
      fetchBranches(project.repository.full_name);
      // Convert secrets object to text format
      const secretsTextFormat = Object.entries(settings.secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\\n');
      setSecretsText(secretsTextFormat);
    }
  }, [isOpen, project.repository.full_name, fetchBranches, settings.secrets]);

  const handleSave = () => {
    // If in text mode, parse the secrets text
    if (secretsMode === 'text') {
      const parsedSecrets: Record<string, string> = {};
      secretsText.split('\\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          parsedSecrets[key.trim()] = valueParts.join('=').trim();
        }
      });
      setSettings(prev => ({ ...prev, secrets: parsedSecrets }));
    }
    
    onSave(settings);
  };

  const handleAddSecret = () => {
    if (newSecret.envVarName && newSecret.value) {
      setSettings(prev => ({
        ...prev,
        secrets: {
          ...prev.secrets,
          [newSecret.envVarName]: newSecret.value
        }
      }));
      setNewSecret({ envVarName: '', value: '' });
    }
  };

  const handleRemoveSecret = (key: string) => {
    setSettings(prev => ({
      ...prev,
      secrets: Object.fromEntries(
        Object.entries(prev.secrets).filter(([k]) => k !== key)
      )
    }));
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecretValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSecretsTextChange = (text: string) => {
    setSecretsText(text);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'rules', label: 'Repository Rules', icon: '📋' },
    { id: 'commands', label: 'Setup Commands', icon: '⚡' },
    { id: 'secrets', label: 'Secrets', icon: '🔐' },
    { id: 'planning', label: 'Planning Statement', icon: '🎯' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Dialog */}
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Project Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {project.repository.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Repository Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository Rules
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Specify any additional rules you want the agent to follow for this repository.
                  </p>
                  <textarea
                    value={settings.repositoryRules}
                    onChange={(e) => setSettings(prev => ({ ...prev, repositoryRules: e.target.value }))}
                    placeholder="Enter custom rules for this repository...\\n\\nExample:\\n- Always use TypeScript for new files\\n- Follow the existing code style\\n- Add comprehensive tests for new features\\n- Update documentation when adding new APIs"
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Setup Commands Tab */}
            {activeTab === 'commands' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setup Commands
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Specify the commands to run when setting up the sandbox environment.
                  </p>
                  <textarea
                    value={settings.setupCommands}
                    onChange={(e) => setSettings(prev => ({ ...prev, setupCommands: e.target.value }))}
                    placeholder="cd backend\\npython api.py\\ncd ..\\ncd frontend\\nnpm install\\nnpm run dev"
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <select
                    value={settings.selectedBranch}
                    onChange={(e) => setSettings(prev => ({ ...prev, selectedBranch: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {branches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name} {branch.name === project.repository.default_branch ? '(default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors">
                    <Play className="w-4 h-4 inline mr-2" />
                    Run
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                    <Save className="w-4 h-4 inline mr-2" />
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Secrets Tab */}
            {activeTab === 'secrets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Environment Variables</h3>
                    <p className="text-sm text-gray-600">
                      Manage secrets and environment variables for this project.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSecretsMode('form')}
                      className={`px-3 py-1 text-xs rounded ${
                        secretsMode === 'form' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Form
                    </button>
                    <button
                      onClick={() => setSecretsMode('text')}
                      className={`px-3 py-1 text-xs rounded ${
                        secretsMode === 'text' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                {secretsMode === 'form' ? (
                  <>
                    {/* Add New Secret */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Secret</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ENV_VAR_NAME"
                          value={newSecret.envVarName}
                          onChange={(e) => setNewSecret(prev => ({ ...prev, envVarName: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={newSecret.value}
                          onChange={(e) => setNewSecret(prev => ({ ...prev, value: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleAddSecret}
                          disabled={!newSecret.envVarName || !newSecret.value}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Existing Secrets */}
                    <div className="space-y-2">
                      {Object.entries(settings.secrets).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="font-mono text-sm text-gray-700">{key}</div>
                            <div className="flex items-center gap-2">
                              <input
                                type={showSecretValues[key] ? 'text' : 'password'}
                                value={value}
                                readOnly
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 font-mono"
                              />
                              <button
                                onClick={() => toggleSecretVisibility(key)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {showSecretValues[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSecret(key)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Environment Variables (KEY=VALUE format)
                    </label>
                    <textarea
                      value={secretsText}
                      onChange={(e) => handleSecretsTextChange(e.target.value)}
                      placeholder="CODEGEN_ORG_ID=323\\nCODEGEN_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99\\nGEMINI_API_KEY=your-api-key"
                      className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Planning Statement Tab */}
            {activeTab === 'planning' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planning Statement
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    This text is sent to the Codegen agent along with the user's target text from the Agent Run dialog.
                  </p>
                  <textarea
                    value={settings.planningStatement}
                    onChange={(e) => setSettings(prev => ({ ...prev, planningStatement: e.target.value }))}
                    placeholder="You are an expert software engineer. Please analyze the requirements and create a comprehensive implementation plan..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-confirm-plan"
                    checked={settings.autoConfirmPlan}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoConfirmPlan: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="auto-confirm-plan" className="text-sm text-gray-700">
                    Auto Confirm Proposed Plan
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
