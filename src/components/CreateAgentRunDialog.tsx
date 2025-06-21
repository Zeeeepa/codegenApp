import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Rocket, Clipboard as ClipboardIcon } from "lucide-react";
import { Dialog } from "./Dialog";
import { getAPIClient } from "../api/client";
import { getAgentRunCache } from "../storage/agentRunCache";
import { validateCredentials, hasCredentials } from "../utils/credentials";
import { OrganizationResponse } from "../api/types";
import { getBackgroundMonitoringService } from "../utils/backgroundMonitoring";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface CreateAgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCreated?: () => void;
}

interface FormValues {
  prompt: string;
  organizationId: string;
  attachClipboard: boolean;
}

export function CreateAgentRunDialog({ isOpen, onClose, onRunCreated }: CreateAgentRunDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({
    prompt: "",
    organizationId: "",
    attachClipboard: false,
  });

  const apiClient = getAPIClient();
  const cache = getAgentRunCache();
  const backgroundMonitoring = getBackgroundMonitoringService();
  const { userInfo } = useCurrentUser();

  // Create welcome message using full name or GitHub username
  const getWelcomeMessage = () => {
    if (!userInfo) return "Welcome! 👋";
    
    const name = userInfo.full_name || 
                 (userInfo.github_username ? userInfo.github_username : null) ||
                 "there";
    
    return `Welcome, ${name}! 👋`;
  };

  // Initialize organizations and default values when dialog opens
  useEffect(() => {
    if (isOpen) {
      initializeDialog();
    }
  }, [isOpen]);

  const initializeDialog = async () => {
    if (!hasCredentials()) {
      setValidationError("API token not configured. Please set it in extension preferences.");
      setIsLoadingOrgs(false);
      return;
    }

    try {
      // Load cached organizations and default from local storage
      const cachedDefaultOrgId = localStorage.getItem("defaultOrganizationId");
      const cachedDefaultOrg = localStorage.getItem("defaultOrganization");
      
      if (cachedDefaultOrgId) {
        setDefaultOrgId(cachedDefaultOrgId);
        setFormValues(prev => ({ ...prev, organizationId: cachedDefaultOrgId }));
      }
      
      // Use cached default organization if available
      if (cachedDefaultOrg) {
        try {
          const defaultOrg: OrganizationResponse = JSON.parse(cachedDefaultOrg);
          if (defaultOrg.id && defaultOrg.name && defaultOrg.settings) {
            setOrganizations([defaultOrg]);
          }
        } catch (parseError) {
          console.log("Could not parse cached default organization:", parseError);
        }
      }

      // Validate credentials and get organizations from API
      const validation = await validateCredentials();
      if (!validation.isValid) {
        setValidationError(validation.error || "Invalid credentials");
        setIsLoadingOrgs(false);
        return;
      }

      // Load organizations from validation result
      if (validation.organizations && validation.organizations.length > 0) {
        const fullOrganizations: OrganizationResponse[] = validation.organizations.map(org => ({
          id: org.id,
          name: org.name,
          settings: {
            enable_pr_creation: true,
            enable_rules_detection: true
          }
        }));
        
        setOrganizations(fullOrganizations);
        
        // If no default org is set but we have organizations, set the first one as default
        if (!cachedDefaultOrgId && fullOrganizations.length > 0) {
          const firstOrg = fullOrganizations[0];
          setFormValues(prev => ({ ...prev, organizationId: firstOrg.id.toString() }));
        }
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

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
      const organizationId = parseInt(formValues.organizationId, 10);
      
      // Prepare request data
      const requestData: any = {
        prompt: formValues.prompt.trim(),
      };

      // Add clipboard content if requested
      if (formValues.attachClipboard) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText) {
            requestData.prompt += `\n\nClipboard content:\n${clipboardText}`;
          }
        } catch (clipboardError) {
          console.warn("Could not read clipboard:", clipboardError);
          toast.error("Could not read clipboard content");
          setIsLoading(false);
          return;
        }
      }

      // Create the agent run
      const agentRun = await apiClient.createAgentRun(organizationId, requestData);
      
      // Automatically add to monitoring (cache and tracking)
      await cache.updateAgentRun(organizationId, agentRun);
      await cache.addToTracking(organizationId, agentRun);
      
      // Start background monitoring
      backgroundMonitoring.start();

      toast.success(`Agent run #${agentRun.id} created and monitoring started!`);
      
      // Dispatch event for immediate UI updates
      window.dispatchEvent(new CustomEvent('agentRunCreated', { 
        detail: { agentRunId: agentRun.id, organizationId } 
      }));
      
      // Reset form
      setFormValues({
        prompt: "",
        organizationId: formValues.organizationId, // Keep the selected org
        attachClipboard: false,
      });

      // Notify parent and close dialog
      if (onRunCreated) {
        onRunCreated();
      }
      onClose();

    } catch (error) {
      console.error("Failed to create agent run:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent run");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormValues({
      prompt: "",
      organizationId: defaultOrgId || "",
      attachClipboard: false,
    });
    setValidationError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Agent Run"
      size="lg"
    >
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2">{getWelcomeMessage()}</h3>
          <p className="text-gray-400">Create a new agent run to get started</p>
        </div>

        {/* Error Display */}
        {validationError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{validationError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Selection */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-2">
              Organization
            </label>
            {isLoadingOrgs ? (
              <div className="animate-pulse bg-gray-700 h-10 rounded-md"></div>
            ) : (
              <select
                id="organization"
                value={formValues.organizationId}
                onChange={(e) => setFormValues(prev => ({ ...prev, organizationId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select an organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id.toString()}>
                    {org.name} (ID: {org.id})
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
              onChange={(e) => setFormValues(prev => ({ ...prev, prompt: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Enter your prompt here..."
              required
            />
          </div>

          {/* Clipboard Attachment */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="attachClipboard"
              checked={formValues.attachClipboard}
              onChange={(e) => setFormValues(prev => ({ ...prev, attachClipboard: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="attachClipboard" className="text-sm text-gray-300 flex items-center">
              <ClipboardIcon className="h-4 w-4 mr-2" />
              Attach clipboard content to prompt
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formValues.prompt.trim() || !formValues.organizationId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Agent Run
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
