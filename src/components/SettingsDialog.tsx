import React, { useState, useEffect } from 'react';
import { Building, Star, StarOff, Copy, RefreshCw, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from './Dialog';
import { validateCredentials, hasCredentials } from '../utils/credentials';
import { getPreferenceValues, setPreferenceValues, validateEnvironmentConfiguration } from '../utils/preferences';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'configuration' | 'organizations';

// Type for organizations from validation (simplified structure)
type BasicOrganization = {
  id: number;
  name: string;
};

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('configuration');
  
  // Configuration tab state
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [envValidation, setEnvValidation] = useState(validateEnvironmentConfiguration());

  // Organizations tab state
  const [organizations, setOrganizations] = useState<BasicOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [defaultOrgId, setDefaultOrgId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const { displayName: userDisplayName } = useCurrentUser();

  // Load configuration data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadConfigurationData();
      loadOrganizationsData();
    }
  }, [isOpen]);

  const loadConfigurationData = async () => {
    try {
      const preferences = await getPreferenceValues();
      setOrgId(preferences.defaultOrganization || '');
      setToken(preferences.apiToken || '');
      
      // We don't need to generate .env content in this component anymore
      
      // Update environment validation
      setEnvValidation(validateEnvironmentConfiguration());
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const loadOrganizationsData = async () => {
    if (!hasCredentials()) {
      setOrgError("API token not configured. Please set it in extension preferences.");
      setIsLoadingOrgs(false);
      return;
    }

    try {
      // Validate credentials and get organizations
      const validation = await validateCredentials();
      if (!validation.isValid) {
        setOrgError(validation.error || "Invalid credentials");
        setIsLoadingOrgs(false);
        return;
      }

      if (validation.organizations) {
        setOrganizations(validation.organizations);
      }

      // Load default organization preference
      const defaultOrg = localStorage.getItem("defaultOrganizationId");
      if (defaultOrg) {
        setDefaultOrgId(parseInt(defaultOrg, 10));
      }
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      // Save using the preference storage system
      await setPreferenceValues({
        apiToken: token,
        defaultOrganization: orgId,
      });
      
      // Settings saved successfully
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Set default organization
  const setDefaultOrganization = async (orgId: number) => {
    try {
      const selectedOrg = organizations.find(org => org.id === orgId);
      
      // Store both the ID and the full organization data
      localStorage.setItem("defaultOrganizationId", orgId.toString());
      if (selectedOrg) {
        localStorage.setItem("defaultOrganization", JSON.stringify(selectedOrg));
      }
      
      setDefaultOrgId(orgId);
      
      toast.success(`${selectedOrg?.name || 'Organization'} will be used as default for new agent runs`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set default organization");
    }
  };

  // Clear default organization
  const clearDefaultOrganization = async () => {
    try {
      localStorage.removeItem("defaultOrganizationId");
      localStorage.removeItem("defaultOrganization");
      setDefaultOrgId(null);
      
      toast.success("No default organization is set");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear default organization");
    }
  };

  // Refresh organizations
  const refreshOrganizations = async () => {
    setIsLoadingOrgs(true);
    setOrgError(null);

    try {
      const validation = await validateCredentials();
      if (validation.isValid && validation.organizations) {
        setOrganizations(validation.organizations);
      } else {
        setOrgError(validation.error || "Failed to load organizations");
      }
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : "Failed to refresh organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  // Filter organizations based on search text
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const tabs = [
    { id: 'configuration' as TabType, label: 'Configuration', icon: SettingsIcon },
    { id: 'organizations' as TabType, label: 'Organizations', icon: Building },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="xl"
    >
      <div className="flex h-96">
        {/* Tab Navigation */}
        <div className="w-48 border-r border-gray-700 pr-4">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 pl-6 overflow-y-auto">
          {activeTab === 'configuration' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">API Configuration</h3>
                
                <div className="space-y-4">
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
                      onClick={handleSaveConfiguration}
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
                </div>
              </div>

              {/* Environment Status */}
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Environment Status</h4>
                <div className="space-y-2 text-sm">
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
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  {userDisplayName ? `Organizations - ${userDisplayName}` : "Organizations"}
                </h3>
                
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
              </div>

              {orgError && !isLoadingOrgs ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <h4 className="text-sm font-medium text-white mb-1">Error Loading Organizations</h4>
                  <p className="text-gray-400 text-sm mb-3">{orgError}</p>
                  <button
                    onClick={refreshOrganizations}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </button>
                </div>
              ) : isLoadingOrgs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-400 text-sm">Loading organizations...</p>
                </div>
              ) : filteredOrganizations.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <h4 className="text-sm font-medium text-white mb-1">
                    {searchText ? "No Matching Organizations" : "No Organizations Found"}
                  </h4>
                  <p className="text-gray-400 text-sm mb-3">
                    {searchText ? "Try adjusting your search terms" : "You don't have access to any organizations"}
                  </p>
                  <button
                    onClick={refreshOrganizations}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrganizations.map((org) => {
                    const isDefault = defaultOrgId === org.id;
                    
                    return (
                      <div
                        key={org.id}
                        className="bg-gray-700 rounded-lg border border-gray-600 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {isDefault ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            ) : (
                              <Building className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <h4 className="text-sm font-medium text-white">{org.name}</h4>
                              <p className="text-xs text-gray-400">ID: {org.id}</p>
                              {isDefault && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200 mt-1">
                                  <Star className="h-2 w-2 mr-1" />
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!isDefault ? (
                              <button
                                onClick={() => setDefaultOrganization(org.id)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-yellow-200 bg-yellow-900 hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-gray-800"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Set Default
                              </button>
                            ) : (
                              <button
                                onClick={clearDefaultOrganization}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800"
                              >
                                <StarOff className="h-3 w-3 mr-1" />
                                Clear
                              </button>
                            )}
                            
                            <button
                              onClick={() => copyToClipboard(org.id.toString(), "Organization ID")}
                              className="inline-flex items-center px-2 py-1 border border-gray-500 text-xs font-medium rounded text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy ID
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
