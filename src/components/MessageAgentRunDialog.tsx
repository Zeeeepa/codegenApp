import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { X, MessageSquare, Send, Loader, Info } from "lucide-react";
import { getAPIClient } from "../api/client";
import { AgentRunResponse, AgentRunStatus } from "../api/types";

interface MessageAgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentRunId: number;
  organizationId: number;
  onMessageSent?: () => void;
}

export function MessageAgentRunDialog({ 
  isOpen, 
  onClose, 
  agentRunId, 
  organizationId,
  onMessageSent 
}: MessageAgentRunDialogProps) {
  const [message, setMessage] = useState("");
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
    }
  }, [isOpen, agentRunId, organizationId, loadAgentRunDetails]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!agentRunDetails) {
      toast.error("Agent run details not loaded");
      return;
    }

    setIsLoading(true);
    try {
      const isActiveStatus = agentRunDetails.status === AgentRunStatus.ACTIVE || 
                            agentRunDetails.status.toLowerCase() === 'active' ||
                            agentRunDetails.status.toLowerCase() === 'running';
      
      const isPausedStatus = agentRunDetails.status === AgentRunStatus.PAUSED ||
                            agentRunDetails.status.toLowerCase() === 'paused';

      const isCompletedStatus = agentRunDetails.status === AgentRunStatus.COMPLETE ||
                               agentRunDetails.status.toLowerCase() === 'complete' ||
                               agentRunDetails.status.toLowerCase() === 'completed';

      const isCancelledStatus = agentRunDetails.status === AgentRunStatus.CANCELLED ||
                               agentRunDetails.status.toLowerCase() === 'cancelled';

      const isFailedStatus = agentRunDetails.status === AgentRunStatus.FAILED ||
                             agentRunDetails.status.toLowerCase() === 'failed' ||
                             agentRunDetails.status.toLowerCase() === 'error';

      // Use resume endpoint for PAUSED runs, message endpoint for COMPLETED/CANCELLED/FAILED runs
      if (isPausedStatus) {
        await apiClient.resumeAgentRun(organizationId, {
          agent_run_id: agentRunId,
          prompt: message.trim(),
        });
        toast.success(`Resumed agent run #${agentRunId} with your message`);
      } else if (isCompletedStatus || isCancelledStatus || isFailedStatus) {
        await apiClient.messageAgentRun(organizationId, {
          agent_run_id: agentRunId,
          prompt: message.trim(),
        });
        toast.success(`Message sent to agent run #${agentRunId}`);
      } else if (isActiveStatus) {
        // For active runs, we can try the message endpoint
        await apiClient.messageAgentRun(organizationId, {
          agent_run_id: agentRunId,
          prompt: message.trim(),
        });
        toast.success(`Message sent to active agent run #${agentRunId}`);
      } else {
        toast.error(`Cannot send message to agent run with status: ${agentRunDetails.status}`);
        return;
      }

      setMessage("");
      onMessageSent?.();
      onClose();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">
              Message Agent Run #{agentRunId}
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
                  <Loader className="h-6 w-6 animate-spin text-purple-400" />
                  <span className="ml-2 text-gray-400">Loading context...</span>
                </div>
              ) : agentRunDetails ? (
                <div className="space-y-4">
                  {/* Status Info Banner */}
                  <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Info className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-300 text-sm">
                        {agentRunDetails.status === AgentRunStatus.PAUSED && 
                          "This agent run is paused. Your message will resume it."}
                        {(agentRunDetails.status === AgentRunStatus.COMPLETE || 
                          agentRunDetails.status.toLowerCase() === 'complete') && 
                          "This agent run is completed. Your message will continue the conversation."}
                        {(agentRunDetails.status === AgentRunStatus.CANCELLED || 
                          agentRunDetails.status.toLowerCase() === 'cancelled') && 
                          "This agent run was cancelled. Your message will restart the conversation."}
                        {(agentRunDetails.status === AgentRunStatus.FAILED || 
                          agentRunDetails.status.toLowerCase() === 'failed') && 
                          "This agent run failed. Your message will attempt to continue from where it left off."}
                        {(agentRunDetails.status === AgentRunStatus.ACTIVE || 
                          agentRunDetails.status.toLowerCase() === 'active') && 
                          "This agent run is currently active. Your message will be added to the conversation."}
                      </span>
                    </div>
                  </div>

                  {/* Status and Result */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Status:</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agentRunDetails.status.toLowerCase() === 'complete' 
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30'
                          : agentRunDetails.status.toLowerCase() === 'failed' || agentRunDetails.status.toLowerCase() === 'error'
                          ? 'bg-red-900/50 text-red-300 border border-red-500/30'
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
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Agent Response:</h4>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3 max-h-40 overflow-y-auto">
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{agentRunDetails.result}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Failed to load agent run context</p>
              )}
            </div>
          </div>

          {/* Message Input Section */}
          <div className="border-t border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your message to continue the conversation with the agent..."
                  className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
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
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
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
