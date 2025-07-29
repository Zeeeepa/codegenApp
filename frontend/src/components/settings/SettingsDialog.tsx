import React, { useState, useEffect } from 'react';
import { X, Building, Settings as SettingsIcon, Github, Eye, EyeOff, AlertCircle, CheckCircle, Save, Cloud } from 'lucide-react';
import { getPreferenceValues, setPreferenceValues, getEnvFileContent, validateEnvironmentConfiguration } from '../utils/preferences';
import { getAPIClient } from '../api/client';
import { OrganizationResponse } from '../api/types';
import { getGitHubClient, resetGitHubClient } from '../api/github';
import { GitHubRepository, GitHubUser } from '../api/githubTypes';
import toast from 'react-hot-toast';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [envContent, setEnvContent] = useState('');
  const [envValidation, setEnvValidation] = useState(validateEnvironmentConfiguration());
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'organizations' | 'github' | 'planning' | 'ai' | 'cloudflare'>('settings');
  
  // GitHub-related state
  const [githubToken, setGithubToken] = useState('');
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [githubTokenValid, setGithubTokenValid] = useState<boolean | null>(null);
  
  // Planning statement state
  const [planningStatement, setPlanningStatement] = useState('');
  
  // Additional environment variables
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [cloudflareApiKey, setCloudflareApiKey] = useState('');
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [cloudflareWorkerName, setCloudflareWorkerName] = useState('webhook-gateway');
  const [cloudflareWorkerUrl, setCloudflareWorkerUrl] = useState('https://webhook-gateway.pixeliumperfecto.workers.dev');
  
  // Token visibility state
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({});

  const handleSave = async () => {
    try {
      // Save using the preference storage system
      await setPreferenceValues({
        apiToken: token,
        defaultOrganization: orgId,
        githubToken: githubToken,
        planningStatement: planningStatement,
        geminiApiKey: geminiApiKey,
        cloudflareApiKey: cloudflareApiKey,
        cloudflareAccountId: cloudflareAccountId,
        cloudflareWorkerName: cloudflareWorkerName,
        cloudflareWorkerUrl: cloudflareWorkerUrl,
      });
      
      // Get the updated .env content
      const content = await getEnvFileContent();
      setEnvContent(content);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const loadOrganizations = async () => {
    if (!token) {
      toast.error('Please enter an API token first');
      return;
    }

    setLoadingOrgs(true);
    try {
      console.log('🔄 Loading organizations with token:', token.substring(0, 10) + '...');
      
      // Update preferences with current token before making API call
      await setPreferenceValues({
        apiToken: token,
        defaultOrganization: orgId,
      });
      
      const apiClient = getAPIClient();
      // Force refresh credentials to pick up the new token
      await apiClient.refreshCredentials();
      
      console.log('🌐 Making organizations API call...');
      const orgs = await apiClient.getOrganizations();
      console.log('✅ Organizations response:', orgs);
      
      setOrganizations(orgs.items);
      toast.success(`Loaded ${orgs.items.length} organizations`);
    } catch (error) {
      console.error('❌ Failed to load organizations:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to load organizations. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Check your API token and network connection.';
      }
      
      toast.error(errorMessage);
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const selectOrganization = (org: OrganizationResponse) => {
    setOrgId(org.id.toString());
    toast.success(`Selected organization: ${org.name}`);
  };

  const validateGithubToken = async () => {
    if (!githubToken) {
      toast.error('Please enter a GitHub token first');
      return;
    }

    try {
      const client = getGitHubClient(githubToken);
      const validation = await client.validateToken();
      
      if (validation.valid && validation.user) {
        setGithubUser(validation.user);
        setGithubTokenValid(true);
        toast.success(`GitHub token validated! Welcome, ${validation.user.login}`);
      } else {
        setGithubUser(null);
        setGithubTokenValid(false);
        toast.error(validation.error || 'Invalid GitHub token');
      }
    } catch (error) {
      console.error('GitHub token validation failed:', error);
      setGithubUser(null);
      setGithubTokenValid(false);
      toast.error('Failed to validate GitHub token');
    }
  };

  const toggleTokenVisibility = (field: string) => {
    setShowTokens(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const testConnection = async (field: string, value: string) => {
    setTestResults(prev => ({ ...prev, [field]: 'testing' }));

    try {
      switch (field) {
        case 'geminiApiKey':
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${value}`);
          setTestResults(prev => ({ 
            ...prev, 
            [field]: geminiResponse.ok ? 'success' : 'error' 
          }));
          if (geminiResponse.ok) {
            toast.success('Gemini API connection successful');
          } else {
            toast.error('Gemini API connection failed');
          }
          break;

        case 'cloudflareApiKey':
          const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}`, {
            headers: {
              'Authorization': `Bearer ${value}`,
              'Content-Type': 'application/json'
            }
          });
          setTestResults(prev => ({ 
            ...prev, 
            [field]: cloudflareResponse.ok ? 'success' : 'error' 
          }));
          if (cloudflareResponse.ok) {
            toast.success('Cloudflare API connection successful');
          } else {
            toast.error('Cloudflare API connection failed');
          }
          break;

        default:
          setTestResults(prev => ({ ...prev, [field]: 'success' }));
      }
    } catch (error) {
      console.error(`Failed to test ${field}:`, error);
      setTestResults(prev => ({ ...prev, [field]: 'error' }));
      toast.error(`Failed to test ${field} connection`);
    }
  };

  const loadGithubRepositories = async () => {
    if (!githubToken) {
      toast.error('Please enter and validate your GitHub token first');
      return;
    }

    if (!githubTokenValid) {
      toast.error('Please validate your GitHub token first');
      return;
    }

    setLoadingGithubRepos(true);
    try {
      const client = getGitHubClient(githubToken);
      const repos = await client.getUserRepositories({
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
      });
      
      setGithubRepos(repos);
      toast.success(`Loaded ${repos.length} repositories`);
    } catch (error) {
      console.error('Failed to load GitHub repositories:', error);
      toast.error('Failed to load repositories');
      setGithubRepos([]);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Load existing values using the preference system
      const loadPreferences = async () => {
        try {
          const preferences = await getPreferenceValues();
          setOrgId(preferences.defaultOrganization || '');
          setToken(preferences.apiToken || '');
          setGithubToken(preferences.githubToken || '');
          setPlanningStatement(preferences.planningStatement || '');
          setGeminiApiKey(preferences.geminiApiKey || '');
          setCloudflareApiKey(preferences.cloudflareApiKey || '');
          setCloudflareAccountId(preferences.cloudflareAccountId || '');
          setCloudflareWorkerName(preferences.cloudflareWorkerName || 'webhook-gateway');
          setCloudflareWorkerUrl(preferences.cloudflareWorkerUrl || 'https://webhook-gateway.pixeliumperfecto.workers.dev');
          
          console.log('Loaded preferences:', {
            hasToken: !!preferences.apiToken,
            hasOrgId: !!preferences.defaultOrganization,
            hasGithubToken: !!preferences.githubToken,
            apiBaseUrl: preferences.apiBaseUrl
          });
          
          // Always generate and show .env content based on current preferences
          const envLines: string[] = [];
          if (preferences.defaultOrganization) {
            envLines.push(`org_id=${preferences.defaultOrganization}`);
          } else {
            envLines.push('org_id=');
          }
          if (preferences.apiToken) {
            envLines.push(`token=${preferences.apiToken}`);
          } else {
            envLines.push('token=');
          }
          const generatedContent = envLines.join('\n') + '\n';
          setEnvContent(generatedContent);
          
          // Also try to load any previously saved .env content
          const savedContent = await getEnvFileContent();
          if (savedContent) {
            setEnvContent(savedContent);
          }
          
          // Update environment validation
          setEnvValidation(validateEnvironmentConfiguration());
        } catch (error) {
          console.error('Failed to load preferences:', error);
        }
      };
      loadPreferences();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden" data-testid="settings-dialog">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              ⚙️ API Settings
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'organizations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              🏢 Organizations
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'github'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Github className="h-4 w-4 inline mr-1" />
              GitHub
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'planning'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📋 Planning Statement
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              🤖 AI Services
            </button>
            <button
              onClick={() => setActiveTab('cloudflare')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'cloudflare'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Cloud className="h-4 w-4 inline mr-1" />
              Cloudflare
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="org_id" className="block text-sm font-medium text-gray-300 mb-2">
                  Organization ID
                </label>
                <input
                  type="text"
                  id="org_id"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your organization ID"
                />
              </div>
              
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                  API Token
                </label>
                <input
                  type="text"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your API token"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                  data-testid="settings-save-button"
                >
                  Save Settings
                </button>
                
                {saved && (
                  <span className="text-green-400 text-sm font-medium">
                    ✓ Settings saved successfully!
                  </span>
                )}
              </div>
              
              {envContent && (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3">📄 .env File Content</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Please update your <code className="bg-gray-700 px-1 rounded">.env</code> file with the following content:
                  </p>
                  <div className="bg-gray-900 p-3 rounded border border-gray-600">
                    <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                      {envContent}
                    </pre>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(envContent)}
                      className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                    >
                      📋 Copy to Clipboard
                    </button>
                    <span className="text-gray-400 text-xs">
                      After updating the .env file, refresh the page to load the new settings.
                    </span>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-lg font-medium text-white mb-2">Environment Variables Status</h3>
                <div className="space-y-3 text-sm">
                  {envValidation.missingVars.length > 0 && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                      <div className="text-red-400 font-medium mb-1">❌ Missing Required Variables:</div>
                      <ul className="text-red-300 text-xs space-y-1">
                        {envValidation.missingVars.map(varName => (
                          <li key={varName}>• {varName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {envValidation.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                      <div className="text-yellow-400 font-medium mb-1">⚠️ Warnings:</div>
                      <ul className="text-yellow-300 text-xs space-y-1">
                        {envValidation.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {envValidation.isValid && envValidation.warnings.length === 0 && (
                    <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                      <div className="text-green-400 font-medium">✅ All environment variables are properly configured!</div>
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-white mb-2 mt-6">Current Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-300">
                    <span className="font-medium">Org ID:</span> 
                    <span className="ml-2 text-gray-400">{orgId || 'Not set'}</span>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Token:</span> 
                    <span className="ml-2 text-gray-400">{token ? `${token.substring(0, 8)}...` : 'Not set'}</span>
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">API Base URL:</span> 
                    <span className="ml-2 text-gray-400">{process.env.REACT_APP_API_BASE_URL || 'Using default'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Available Organizations</h3>
                <button
                  onClick={loadOrganizations}
                  disabled={loadingOrgs || !token}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                >
                  {loadingOrgs ? 'Loading...' : 'Load Organizations'}
                </button>
              </div>

              {!token && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    Please enter your API token in the Settings tab first, then click "Load Organizations".
                  </p>
                </div>
              )}

              {organizations.length > 0 && (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        orgId === org.id.toString()
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => selectOrganization(org)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-gray-400" />
                          <div>
                            <h4 className="text-white font-medium">{org.name}</h4>
                            <p className="text-gray-400 text-sm">ID: {org.id}</p>
                          </div>
                        </div>
                        {orgId === org.id.toString() && (
                          <span className="text-blue-400 text-sm font-medium">✓ Selected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {organizations.length === 0 && token && !loadingOrgs && (
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-center">
                  <p className="text-gray-400">No organizations loaded. Click "Load Organizations" to fetch them.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="github_token" className="block text-sm font-medium text-gray-300 mb-2">
                  GitHub Personal Access Token
                </label>
                <div className="space-y-3">
                  <input
                    type="password"
                    id="github_token"
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setGithubTokenValid(null);
                      setGithubUser(null);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={validateGithubToken}
                      disabled={!githubToken}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                    >
                      Validate Token
                    </button>
                    
                    {githubTokenValid === true && (
                      <span className="text-green-400 text-sm font-medium flex items-center">
                        ✓ Token is valid
                      </span>
                    )}
                    
                    {githubTokenValid === false && (
                      <span className="text-red-400 text-sm font-medium flex items-center">
                        ✗ Token is invalid
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>How to create a GitHub token:</strong>
                  </p>
                  <ol className="text-blue-300 text-xs mt-2 space-y-1 list-decimal list-inside">
                    <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                    <li>Click "Generate new token (classic)"</li>
                    <li>Select scopes: <code className="bg-gray-700 px-1 rounded">repo</code>, <code className="bg-gray-700 px-1 rounded">read:user</code></li>
                    <li>Copy the generated token and paste it above</li>
                  </ol>
                </div>
              </div>

              {githubUser && (
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-3">GitHub Account</h3>
                  <div className="flex items-center space-x-3">
                    <img
                      src={githubUser.avatar_url}
                      alt={githubUser.login}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="text-white font-medium">{githubUser.name || githubUser.login}</p>
                      <p className="text-gray-400 text-sm">@{githubUser.login}</p>
                      {githubUser.email && (
                        <p className="text-gray-400 text-sm">{githubUser.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-white font-medium">{githubUser.public_repos}</p>
                      <p className="text-gray-400">Repositories</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">{githubUser.followers}</p>
                      <p className="text-gray-400">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">{githubUser.following}</p>
                      <p className="text-gray-400">Following</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Your Repositories</h3>
                  <button
                    onClick={loadGithubRepositories}
                    disabled={loadingGithubRepos || !githubTokenValid}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                  >
                    {loadingGithubRepos ? 'Loading...' : 'Load Repositories'}
                  </button>
                </div>

                {!githubTokenValid && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      Please validate your GitHub token first to load repositories.
                    </p>
                  </div>
                )}

                {githubRepos.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {githubRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="p-3 border border-gray-600 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{repo.name}</h4>
                              <p className="text-gray-400 text-sm">{repo.full_name}</p>
                              {repo.description && (
                                <p className="text-gray-300 text-sm mt-1">{repo.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            {repo.language && (
                              <span className="px-2 py-1 bg-gray-700 rounded">{repo.language}</span>
                            )}
                            {repo.private && (
                              <span className="px-2 py-1 bg-yellow-700 rounded">Private</span>
                            )}
                            <span>⭐ {repo.stargazers_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {githubRepos.length === 0 && githubTokenValid && !loadingGithubRepos && (
                  <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-center">
                    <p className="text-gray-400">No repositories loaded. Click "Load Repositories" to fetch them.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Planning Statement</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure a global planning statement that will be prepended to all agent run prompts. 
                  This helps provide consistent context and instructions to the agent across all projects.
                </p>
              </div>
              
              <div>
                <label htmlFor="planning_statement" className="block text-sm font-medium text-gray-300 mb-2">
                  Global Planning Statement
                </label>
                <textarea
                  id="planning_statement"
                  value={planningStatement}
                  onChange={(e) => setPlanningStatement(e.target.value)}
                  placeholder="Enter your global planning statement here. This will be sent to the agent along with the user's target and project context..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={12}
                />
                <p className="text-xs text-gray-500 mt-2">
                  This statement will be combined with project-specific context and user targets when creating agent runs.
                  Projects can override this with their own planning statements in project settings.
                </p>
              </div>

              <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                <h4 className="text-blue-300 font-medium mb-2">💡 Tips for effective planning statements:</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Be specific about coding standards and best practices</li>
                  <li>• Include preferred frameworks, libraries, or tools</li>
                  <li>• Specify testing requirements and documentation standards</li>
                  <li>• Mention any security or performance considerations</li>
                  <li>• Include workflow preferences (commit messages, PR descriptions, etc.)</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                <h4 className="text-gray-300 font-medium mb-2">Example Planning Statement:</h4>
                <pre className="text-gray-400 text-sm whitespace-pre-wrap">
{`You are an expert software engineer. When working on projects:

1. Follow TypeScript best practices and use strict typing
2. Write comprehensive tests for all new functionality
3. Use meaningful commit messages following conventional commits
4. Add JSDoc comments for all public functions
5. Ensure code is accessible and follows WCAG guidelines
6. Use React hooks and functional components
7. Implement proper error handling and loading states
8. Follow the existing code style and patterns in the project

Always explain your approach before implementing changes.`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">AI Services Configuration</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure API keys for AI services used by the application for web evaluation and testing.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="gemini_api_key" className="block text-sm font-medium text-gray-300 mb-2">
                    Gemini API Key
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Google Gemini API key for web evaluation and testing with web-eval-agent
                  </p>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <input
                        id="gemini_api_key"
                        type={showTokens.geminiApiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => {
                          setGeminiApiKey(e.target.value);
                          setTestResults(prev => ({ ...prev, geminiApiKey: null }));
                        }}
                        placeholder="Enter your Gemini API key"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="settings-gemini-api-key"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('geminiApiKey')}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-300"
                        data-testid="toggle-gemini-api-key-visibility"
                      >
                        {showTokens.geminiApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {geminiApiKey && (
                      <button
                        onClick={() => testConnection('geminiApiKey', geminiApiKey)}
                        disabled={testResults.geminiApiKey === 'testing'}
                        className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-1"
                        data-testid="test-gemini-api-key"
                      >
                        {testResults.geminiApiKey === 'testing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : testResults.geminiApiKey === 'success' ? (
                          <CheckCircle size={16} />
                        ) : testResults.geminiApiKey === 'error' ? (
                          <AlertCircle size={16} />
                        ) : (
                          'Test'
                        )}
                      </button>
                    )}
                  </div>
                  {testResults.geminiApiKey === 'success' && (
                    <p className="text-xs text-green-400 flex items-center space-x-1 mt-1">
                      <CheckCircle size={12} />
                      <span>Gemini API connection successful</span>
                    </p>
                  )}
                  {testResults.geminiApiKey === 'error' && (
                    <p className="text-xs text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle size={12} />
                      <span>Gemini API connection failed</span>
                    </p>
                  )}
                </div>

                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <h4 className="text-blue-300 font-medium mb-2">🔑 How to get a Gemini API key:</h4>
                  <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Click "Create API Key"</li>
                    <li>Copy the generated key and paste it above</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloudflare' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Cloudflare Configuration</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Configure Cloudflare settings for webhook handling and online accessibility.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="cloudflare_api_key" className="block text-sm font-medium text-gray-300 mb-2">
                    Cloudflare API Key
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Your Cloudflare API token for managing workers and webhooks
                  </p>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <input
                        id="cloudflare_api_key"
                        type={showTokens.cloudflareApiKey ? 'text' : 'password'}
                        value={cloudflareApiKey}
                        onChange={(e) => {
                          setCloudflareApiKey(e.target.value);
                          setTestResults(prev => ({ ...prev, cloudflareApiKey: null }));
                        }}
                        placeholder="Enter your Cloudflare API key"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="settings-cloudflare-api-key"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('cloudflareApiKey')}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-300"
                        data-testid="toggle-cloudflare-api-key-visibility"
                      >
                        {showTokens.cloudflareApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {cloudflareApiKey && cloudflareAccountId && (
                      <button
                        onClick={() => testConnection('cloudflareApiKey', cloudflareApiKey)}
                        disabled={testResults.cloudflareApiKey === 'testing'}
                        className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-1"
                        data-testid="test-cloudflare-api-key"
                      >
                        {testResults.cloudflareApiKey === 'testing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : testResults.cloudflareApiKey === 'success' ? (
                          <CheckCircle size={16} />
                        ) : testResults.cloudflareApiKey === 'error' ? (
                          <AlertCircle size={16} />
                        ) : (
                          'Test'
                        )}
                      </button>
                    )}
                  </div>
                  {testResults.cloudflareApiKey === 'success' && (
                    <p className="text-xs text-green-400 flex items-center space-x-1 mt-1">
                      <CheckCircle size={12} />
                      <span>Cloudflare API connection successful</span>
                    </p>
                  )}
                  {testResults.cloudflareApiKey === 'error' && (
                    <p className="text-xs text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle size={12} />
                      <span>Cloudflare API connection failed</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="cloudflare_account_id" className="block text-sm font-medium text-gray-300 mb-2">
                    Account ID
                  </label>
                  <input
                    id="cloudflare_account_id"
                    type="text"
                    value={cloudflareAccountId}
                    onChange={(e) => setCloudflareAccountId(e.target.value)}
                    placeholder="Enter your Cloudflare account ID"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="settings-cloudflare-account-id"
                  />
                </div>

                <div>
                  <label htmlFor="cloudflare_worker_name" className="block text-sm font-medium text-gray-300 mb-2">
                    Worker Name
                  </label>
                  <input
                    id="cloudflare_worker_name"
                    type="text"
                    value={cloudflareWorkerName}
                    onChange={(e) => setCloudflareWorkerName(e.target.value)}
                    placeholder="webhook-gateway"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="settings-cloudflare-worker-name"
                  />
                </div>

                <div>
                  <label htmlFor="cloudflare_worker_url" className="block text-sm font-medium text-gray-300 mb-2">
                    Worker URL
                  </label>
                  <input
                    id="cloudflare_worker_url"
                    type="url"
                    value={cloudflareWorkerUrl}
                    onChange={(e) => setCloudflareWorkerUrl(e.target.value)}
                    placeholder="https://webhook-gateway.pixeliumperfecto.workers.dev"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="settings-cloudflare-worker-url"
                  />
                </div>

                <div className="p-4 bg-orange-900/20 border border-orange-700 rounded-lg">
                  <h4 className="text-orange-300 font-medium mb-2">🔑 How to get Cloudflare credentials:</h4>
                  <ol className="text-orange-200 text-sm space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Cloudflare API Tokens</a></li>
                    <li>Click "Create Token" and use the "Custom token" template</li>
                    <li>Add permissions: Account:Read, Zone:Read, Zone:Edit</li>
                    <li>Find your Account ID in the right sidebar of any Cloudflare dashboard page</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
