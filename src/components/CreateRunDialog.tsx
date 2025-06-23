import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Rocket, Clipboard as ClipboardIcon, X } from "lucide-react";
import { getAPIClient } from "../api/client";
import { getAgentRunCache } from "../storage/agentRunCache";
import { validateCredentials, hasCredentials } from "../utils/credentials";
import { OrganizationResponse } from "../api/types";
import { useCachedAgentRuns } from "../hooks/useCachedAgentRuns";

import { useCurrentUser } from "../hooks/useCurrentUser";
import { useDialog } from "../contexts/DialogContext";

interface FormValues {
  prompt: string;
  organizationId: string;
  attachClipboard: boolean;
}

export function CreateRunDialog() {
  const { closeDialog, dialogData } = useDialog();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { refresh, addNewAgentRun, organizationId } = useCachedAgentRuns();

  const apiClient = getAPIClient();
  const cache = getAgentRunCache();
  const { userInfo } = useCurrentUser();

  // Form state
  const [formValues, setFormValues] = useState<FormValues>({
    prompt: "",
    organizationId: dialogData?.organizationId || "",
    attachClipboard: false,
  });

  // Create welcome message using full name or GitHub username
  const getWelcomeMessage = () => {
    if (!userInfo) return "Welcome! 👋";
    
    const name = userInfo.full_name || 
                 (userInfo.github_username ? userInfo.github_username : null) ||
                 "there";
    
    return `Welcome, ${name}! 👋`;
  };

  // Validate credentials and load organizations on mount
  useEffect(() => {
    async function initialize() {
      try {
        setValidationError(null);
        
        // Check if we have credentials
        if (!hasCredentials()) {
          setValidationError("Please configure your API credentials in Settings first.");
          setIsLoadingOrgs(false);
          return;
        }

        // Validate credentials
        const validation = await validateCredentials();
        if (!validation.isValid) {
          setValidationError(validation.error || "Invalid credentials. Please check your settings.");
          setIsLoadingOrgs(false);
          return;
        }

        // Load organizations
        const orgsResponse = await apiClient.getOrganizations();
        const orgs = Array.isArray(orgsResponse) ? orgsResponse : orgsResponse.items || [];
        setOrganizations(orgs);
        
        // Set default organization if provided in dialog data or if there's only one
        if (dialogData?.organizationId) {
          setFormValues(prev => ({ ...prev, organizationId: dialogData.organizationId.toString() }));
        } else if (orgs.length === 1) {
          setFormValues(prev => ({ ...prev, organizationId: orgs[0].id.toString() }));
        }
        
      } catch (error) {
        console.error("Failed to initialize:", error);
        setValidationError(error instanceof Error ? error.message : "Failed to load organizations");
      } finally {
        setIsLoadingOrgs(false);
      }
    }

    initialize();
  }, [dialogData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValues.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    if (!formValues.organizationId) {
      toast.error("Please select an organization");
      return;
    }

    setIsLoading(true);

    try {
      let finalPrompt = formValues.prompt.trim();
      
      // Attach clipboard content if requested
      if (formValues.attachClipboard) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText.trim()) {
            finalPrompt += `\n\nClipboard content:\n${clipboardText}`;
          }
        } catch (clipboardError) {
          console.warn("Could not read clipboard:", clipboardError);
          toast.error("Could not read clipboard content");
        }
      }

      // Create the agent run
      const agentRun = await apiClient.createAgentRun(parseInt(formValues.organizationId), {
        prompt: finalPrompt,
      });

      // Cache the agent run
      await cache.updateAgentRun(parseInt(formValues.organizationId), agentRun);
      
      // Add to tracking for monitoring by default
      await cache.addToTracking(parseInt(formValues.organizationId), agentRun);

      // Convert to CachedAgentRun and add immediately to UI
      const cachedAgentRun = {
        ...agentRun,
        organization_id: parseInt(formValues.organizationId), // Ensure organization_id is set
        lastUpdated: new Date().toISOString(),
        organizationName: undefined,
        isPolling: ['ACTIVE', 'EVALUATION', 'PENDING', 'RUNNING'].includes(agentRun.status.toUpperCase()) // Monitor active runs
      };
      
      console.log(`🚀 Created agent run #${agentRun.id} with status: ${agentRun.status}`);
      console.log(`📋 Form organization ID: ${formValues.organizationId} (type: ${typeof formValues.organizationId})`);
      console.log(`📋 Cached agent run object:`, cachedAgentRun);
      console.log(`🎯 Will be monitored: ${cachedAgentRun.isPolling}`);
      console.log(`🔍 Current hook organization ID: ${organizationId}`);
      
      // Add to UI immediately for instant feedback
      addNewAgentRun(cachedAgentRun);

      // Force immediate refresh to ensure UI is updated
      console.log(`🔄 Forcing immediate refresh to ensure agent run #${agentRun.id} appears in UI`);
      await refresh();

      // Additional backup refresh after a short delay
      setTimeout(async () => {
        console.log(`🔄 Backup refresh to ensure agent run #${agentRun.id} is still visible`);
        await refresh();
      }, 1000);

      toast.success(`Agent run #${agentRun.id} created successfully!`);
      
      // Close the dialog
      closeDialog();
      
    } catch (error) {
      console.error("Failed to create agent run:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent run");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormValues, value: string | boolean) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Rocket className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Create Agent Run</h2>
          </div>
          <button
            onClick={closeDialog}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {validationError ? (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-300 text-sm">{validationError}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-2">{getWelcomeMessage()}</h3>
                <p className="text-gray-300 text-sm">
                  Create a new agent run by providing a prompt. The agent will execute your request and provide results.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Selection */}
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-2">
                    Organization
                  </label>
                  {isLoadingOrgs ? (
                    <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400">
                      Loading organizations...
                    </div>
                  ) : (
                    <select
                      id="organization"
                      value={formValues.organizationId}
                      onChange={(e) => handleInputChange('organizationId', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select an organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Prompt Input */}
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={formValues.prompt}
                    onChange={(e) => handleInputChange('prompt', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your prompt here..."
                    rows={6}
                    required
                  />
                </div>

                {/* Clipboard Attachment */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="attachClipboard"
                    checked={formValues.attachClipboard}
                    onChange={(e) => handleInputChange('attachClipboard', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  />
                  <label htmlFor="attachClipboard" className="text-sm text-gray-300 flex items-center space-x-1">
                    <ClipboardIcon className="h-4 w-4" />
                    <span>Attach clipboard content</span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isLoadingOrgs || !!validationError}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        <span>Create Agent Run</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
