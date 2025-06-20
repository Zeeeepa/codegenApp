import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  Settings as SettingsIcon, 
  Building, 
  RefreshCw, 
  AlertCircle, 
  Star, 
  StarOff, 
  Copy,
  Play
} from "lucide-react";
import { Dialog } from "./Dialog";
import { validateEnvironmentConfiguration } from "../utils/preferences";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setOrganizationId?: (orgId: number) => void;
}

// Removed TabType as we're consolidating into a single interface

// Type for organizations from validation (simplified structure)
type BasicOrganization = {
  id: number;
  name: string;
};

export function SettingsDialog({ isOpen, onClose, setOrganizationId }: SettingsDialogProps) {
  // Removed tab state as we're using a single unified interface
  
  // Configuration tab state
  const [orgId, setOrgId] = useState('');
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [envValidation, setEnvValidation] = useState(validateEnvironmentConfiguration());

  // Organizations tab state
  const [organizations, setOrganizations] = useState<BasicOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [defaultOrgId, setDefaultOrgId] = useState<number | null>(null);

  // Load initial values when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load configuration values
      const savedOrgId = localStorage.getItem('CODEGEN_ORGANIZATION_ID') || '';
      const savedToken = localStorage.getItem('CODEGEN_API_TOKEN') || '';
      setOrgId(savedOrgId);
      setToken(savedToken);
      
      // Load default organization
      const savedDefaultOrgId = localStorage.getItem('DEFAULT_ORGANIZATION_ID');
      if (savedDefaultOrgId) {
        setDefaultOrgId(parseInt(savedDefaultOrgId));
      }
      
      // Refresh environment validation
      setEnvValidation(validateEnvironmentConfiguration());
      
      // Load organizations
      refreshOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('CODEGEN_ORGANIZATION_ID', orgId);
      localStorage.setItem('CODEGEN_API_TOKEN', token);
      
      // Refresh environment validation after saving
      setEnvValidation(validateEnvironmentConfiguration());
      
      toast.success('Configuration saved successfully!');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      // Simple validation - check if values are provided
      if (!orgId || !token) {
        toast.error('Please provide both Organization ID and API Token');
        return;
      }
      
      // Here you could add actual API validation
      toast.success('Configuration appears valid!');
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const refreshOrganizations = async () => {
    setIsLoadingOrgs(true);
    setOrgError(null);
    
    try {
      const orgIdToUse = orgId || localStorage.getItem('CODEGEN_ORGANIZATION_ID');
      const tokenToUse = token || localStorage.getItem('CODEGEN_API_TOKEN');
      
      if (!orgIdToUse || !tokenToUse) {
        setOrgError('Please configure your Organization ID and API Token first');
        return;
      }

      const response = await fetch(`/api/v1/organizations/${orgIdToUse}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.organizations && Array.isArray(data.organizations)) {
        setOrganizations(data.organizations);
        setUserDisplayName(data.user?.display_name || data.user?.name || null);
      } else {
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setOrgError(error instanceof Error ? error.message : 'Failed to load organizations');
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const setDefaultOrganization = (orgId: number) => {
    localStorage.setItem('DEFAULT_ORGANIZATION_ID', orgId.toString());
    setDefaultOrgId(orgId);
    toast.success('Default organization set!');
  };

  const clearDefaultOrganization = () => {
    localStorage.removeItem('DEFAULT_ORGANIZATION_ID');
    setDefaultOrgId(null);
    toast.success('Default organization cleared!');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    }).catch(() => {
      toast.error(`Failed to copy ${label}`);
    });
  };

  // Filter organizations based on search text
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="xl"
    >
      <div className="max-h-96 overflow-y-auto space-y-8">
        {/* Configuration Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            API Configuration
          </h3>
          
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
            
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
              
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
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

        {/* Organizations Section */}
        <div className="space-y-6 border-t border-gray-700 pt-8">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            {userDisplayName ? `Organizations - ${userDisplayName}` : "Organizations"}
          </h3>
          
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />

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
                    className={`p-4 rounded-lg border transition-colors ${
                      isDefault 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {org.name}
                          </h4>
                          {isDefault && (
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">ID: {org.id}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            if (setOrganizationId) {
                              setOrganizationId(org.id);
                              onClose();
                              toast.success(`Switched to ${org.name}`);
                            }
                          }}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-200 bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          View Runs
                        </button>
                        
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
      </div>
    </Dialog>
  );
}
