import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { X, Play, Send, Loader } from "lucide-react";
import { getAPIClient } from "../api/client";
import { AgentRunResponse } from "../api/types";

interface ResumeAgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentRunId: number;
  organizationId: number;
  onResumed?: () => void;
}

export function ResumeAgentRunDialog({ 
  isOpen, 
  onClose, 
  agentRunId, 
  organizationId,
  onResumed 
}: ResumeAgentRunDialogProps) {
  const [prompt, setPrompt] = useState("Continue with the previous task");
  const [isLoading, setIsLoading] = useState(false);
  const [agentRunDetails, setAgentRunDetails] = useState<AgentRunResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const apiClient = getAPIClient();

  const loadAgentRunDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    try {
      const details = await apiClient.getAgentRun(organizationId, agentRunId);
      setAgentRunDetails(details);
    } catch (error) {
      console.error("Failed to load agent run details:", error);
      toast.error("Failed to load agent run details");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [apiClient, organizationId, agentRunId]);

  // Load agent run details when dialog opens
  useEffect(() => {
    if (isOpen && agentRunId && organizationId) {
      loadAgentRunDetails();
      // Reset prompt to default when dialog opens
      setPrompt("Continue with the previous task");
    }
  }, [isOpen, agentRunId, organizationId, loadAgentRunDetails]);

  // Extract authentication context for backend automation
  const extractAuthContext = () => {
    try {
      // Extract cookies
      const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
          name: name,
          value: value || '',
          domain: window.location.hostname,
          path: '/',
          httpOnly: false,
          secure: window.location.protocol === 'https:'
        };
      }).filter(cookie => cookie.name && cookie.value);

      // Extract localStorage
      const localStorage: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const value = window.localStorage.getItem(key);
          if (value) {
            localStorage[key] = value;
          }
        }
      }

      // Extract sessionStorage
      const sessionStorage: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          const value = window.sessionStorage.getItem(key);
          if (value) {
            sessionStorage[key] = value;
          }
        }
      }

      return {
        cookies: cookies,
        localStorage: localStorage,
        sessionStorage: sessionStorage,
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to extract auth context:', error);
      return null;
    }
  };

  const handleResumeAgentRun = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt to resume the agent run");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 Using backend automation to resume agent run:", {
        organizationId,
        agentRunId,
        prompt: prompt.trim(),
        agentRunStatus: agentRunDetails?.status
      });
      
      // Extract authentication context
      const authContext = extractAuthContext();
      if (!authContext) {
        throw new Error("Failed to extract authentication context");
      }

      // Call backend automation service
      const response = await fetch('/automation/api/resume-agent-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentRunId,
          organizationId,
          prompt: prompt.trim(),
          authContext
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log("🎉 Backend automation completed successfully:", result);
      
      toast.success(`Agent run #${agentRunId} resumed successfully! (${result.duration}ms)`);
      
      // Update local cache to reflect ACTIVE status
      try {
        const { getAgentRunCache } = await import('../storage/agentRunCache');
        const cache = getAgentRunCache();
        
        // Update the agent run status to ACTIVE
        if (agentRunDetails) {
          const updatedAgentRun = {
            ...agentRunDetails,
            status: 'ACTIVE'
          };
          await cache.updateAgentRun(organizationId, updatedAgentRun);
        }
      } catch (cacheError) {
        console.warn('Failed to update cache after resume:', cacheError);
      }
      
      // Reset to default and trigger refresh to show updated status
      setPrompt("Continue with the previous task");
      onResumed?.(); // This will refresh the dashboard to show active state
      onClose();
      
    } catch (error) {
      console.error("❌ Backend automation failed:", error);
      
      // Provide helpful error message based on error type
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('Backend automation service not available') || 
            error.message.includes('Cannot connect to backend')) {
          errorMessage = `${error.message}\n\nTo enable resume functionality:\n1. Navigate to the 'backend' directory\n2. Run 'npm install' then 'npm start'\n3. Ensure the backend server is running on port 3002`;
        } else {
          errorMessage = error.message;
        }
      }
      
      // Fallback to manual approach
      const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
      
      try {
        await navigator.clipboard.writeText(prompt.trim());
        toast.error(`Backend automation failed. Opened agent run in browser - your message is copied to clipboard.`);
      } catch (clipboardError) {
        console.error("Clipboard error:", clipboardError);
        toast.error(`Backend automation failed. Opened agent run in browser - please paste: "${prompt.trim()}"`);
      }
      
      toast.error(`Failed to resume agent run: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleResumeAgentRun();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Play className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">
              Resume Agent Run #{agentRunId}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col h-[70vh]">
          {/* Context Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-lg font-medium text-white mb-3">Agent Run Context</h3>
              
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin text-green-400" />
                  <span className="ml-2 text-gray-400">Loading context...</span>
                </div>
              ) : agentRunDetails ? (
                <div className="space-y-4">
                  {/* Status and Result */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Status:</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agentRunDetails.status.toLowerCase() === 'complete' 
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30'
                          : agentRunDetails.status.toLowerCase() === 'failed' || agentRunDetails.status.toLowerCase() === 'error'
                          ? 'bg-red-900/50 text-red-300 border border-red-500/30'
                          : agentRunDetails.status.toLowerCase() === 'stopped' || agentRunDetails.status.toLowerCase() === 'paused'
                          ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
                          : 'bg-gray-900/50 text-gray-300 border border-gray-500/30'
                      }`}>
                        {agentRunDetails.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Created:</h4>
                      <p className="text-gray-400 text-sm">
                        {new Date(agentRunDetails.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Result/Response */}
                  {agentRunDetails.result && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Previous Agent Response:</h4>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3 max-h-40 overflow-y-auto">
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{agentRunDetails.result}</p>
                      </div>
                    </div>
                  )}

                  {/* Resume Instructions */}
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                    <p className="text-blue-200 text-sm">
                      💡 <strong>Resume Instructions:</strong> Enter a prompt to continue this agent run. 
                      The system will automatically open the agent chat and send your message.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Failed to load agent run context</p>
              )}
            </div>
          </div>

          {/* Resume Prompt Input Section */}
          <div className="border-t border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="resume-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                  Resume Prompt
                </label>
                <textarea
                  id="resume-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter instructions for the agent to continue..."
                  className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to resume
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResumeAgentRun}
                  disabled={isLoading || !prompt.trim()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Resume Agent Run
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
