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

  const handleResumeAgentRun = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🚀 Automating browser to resume agent run:", {
        organizationId,
        agentRunId,
        prompt: prompt.trim(),
        agentRunStatus: agentRunDetails?.status
      });
      
      // Construct the Codegen chat URL for this agent run
      const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
      
      // Open invisible browser window
      const browserWindow = window.open(chatUrl, '_blank', 'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no');
      
      if (!browserWindow) {
        throw new Error("Failed to open browser window - popup blocked?");
      }

      // Wait for page to load and then automate the chat input
      setTimeout(async () => {
        try {
          const doc = browserWindow.document;
          
          // Wait a bit more for the page to fully load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try primary XPath selector first
          let chatInput = doc.evaluate(
            '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue as HTMLElement;
          
          // Fallback to CSS selector if XPath fails
          if (!chatInput) {
            chatInput = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div') as HTMLElement;
          }
          
          // If still not found, try to find any textarea or input in the chat area
          if (!chatInput) {
            chatInput = doc.querySelector('#chat-bar textarea, #chat-bar input[type="text"]') as HTMLElement;
          }
          
          if (!chatInput) {
            throw new Error("Could not find chat input element");
          }
          
          // Focus and set the text
          chatInput.focus();
          if (chatInput.tagName.toLowerCase() === 'textarea' || chatInput.tagName.toLowerCase() === 'input') {
            (chatInput as HTMLInputElement | HTMLTextAreaElement).value = prompt.trim();
            
            // Trigger input events to ensure React state updates
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            chatInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          // Wait a moment for React to process the input
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Find and click the send button
          let sendButton = doc.evaluate(
            '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[2]/div[2]/button',
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue as HTMLButtonElement;
          
          // Fallback CSS selector for send button
          if (!sendButton) {
            sendButton = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div > div.flex.items-center.justify-between > div.flex.items-center.gap-3 > button') as HTMLButtonElement;
          }
          
          // Generic fallback - look for any submit button in the chat area
          if (!sendButton) {
            sendButton = doc.querySelector('#chat-bar button[type="submit"], #chat-bar button:last-child') as HTMLButtonElement;
          }
          
          if (sendButton) {
            sendButton.click();
            
            // Wait for message to be sent
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Close the browser window
            browserWindow.close();
            
            toast.success(`Agent run #${agentRunId} has been resumed successfully!`);
            
            // Update agent state and refresh
            setPrompt("Continue with the previous task"); // Reset to default
            onResumed?.(); // Trigger refresh to show updated status
            onClose();
          } else {
            throw new Error("Could not find send button");
          }
          
        } catch (automationError) {
          console.error("Browser automation failed:", automationError);
          browserWindow.close();
          
          // Fallback to the manual approach
          const fallbackWindow = window.open(chatUrl, '_blank', 'noopener,noreferrer');
          await navigator.clipboard.writeText(prompt.trim());
          
          toast.error(`Automation failed. Opened agent run in browser - please paste your message: "${prompt.trim()}"`);
          
          setPrompt("Continue with the previous task");
          onResumed?.();
          onClose();
        }
      }, 2000); // Wait 2 seconds for initial page load
      
    } catch (error) {
      console.error("Failed to automate browser:", error);
      
      // Fallback to manual approach
      const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
      
      try {
        await navigator.clipboard.writeText(prompt.trim());
        toast.error(`Automation failed. Opened agent run in browser - your message is copied to clipboard.`);
      } catch {
        toast.error(`Automation failed. Opened agent run in browser - please paste: "${prompt.trim()}"`);
      }
      
      setPrompt("Continue with the previous task");
      onResumed?.();
      onClose();
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
