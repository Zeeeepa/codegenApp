import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Building2 } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { getPreferenceValues, setPreferenceValues, getEnvFileContent, validateEnvironmentConfiguration } from '../utils/preferences';
import { getAPIClient } from '../api/client';
import { OrganizationResponse } from '../api/types';
import { hasCredentials } from '../utils/credentials';

export function SettingsDialog() {
  const { closeDialog } = useDialog();
  const [activeTab, setActiveTab] = useState<'settings' | 'organizations'>('settings');
  
  // Settings state
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [envContent, setEnvContent] = useState('');
  const [envValidation, setEnvValidation] = useState(validateEnvironmentConfiguration());

  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      // Save using the preference storage system
      await setPreferenceValues({
        apiToken: token,
        defaultOrganization: orgId,
      });
      
      // Get the updated .env content
      const content = await getEnvFileContent();
      setEnvContent(content);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const loadOrganizations = async () => {
    if (!hasCredentials()) {
      setOrgsError("Please configure your API credentials first.");
      return;
    }

    setIsLoadingOrgs(true);
    setOrgsError(null);

    try {
      const apiClient = getAPIClient();
      const orgsResponse = await apiClient.getOrganizations();
      const orgs = Array.isArray(orgsResponse) ? orgsResponse : orgsResponse.items || [];
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrgsError(error instanceof Error ? error.message : 'Failed to load organizations');
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    // Load existing values using the preference system
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferenceValues();
        setOrgId(preferences.defaultOrganization || '');
        setToken(preferences.apiToken || '');
        
        console.log('Loaded preferences:', {
          hasToken: !!preferences.apiToken,
          hasOrgId: !!preferences.defaultOrganization,
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
  }, []);

  useEffect(() => {
    // Load organizations when switching to organizations tab
    if (activeTab === 'organizations' && organizations.length === 0) {
      loadOrganizations();
    }
  }, [activeTab, organizations.length]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-gray-700 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={closeDialog}
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
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-4 w-4" />
                <span>API Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'organizations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Organizations</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'settings' ? (
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
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Organizations</h3>
                <button
                  onClick={loadOrganizations}
                  disabled={isLoadingOrgs}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {isLoadingOrgs ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {orgsError && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400">⚠️</span>
                    <span className="text-red-300 text-sm">{orgsError}</span>
                  </div>
                </div>
              )}

              {isLoadingOrgs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading organizations...</span>
                </div>
              ) : organizations.length > 0 ? (
                <div className="space-y-4">
                  {organizations.map((org) => (
                    <div key={org.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{org.name}</h4>
                          <p className="text-gray-400 text-sm">ID: {org.id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {orgId === org.id.toString() && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                              Default
                            </span>
                          )}
                          <button
                            onClick={() => setOrgId(org.id.toString())}
                            className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            Set as Default
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !orgsError && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No organizations found</p>
                  <p className="text-gray-500 text-sm">Make sure your API credentials are configured correctly</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
