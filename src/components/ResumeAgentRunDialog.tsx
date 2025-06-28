import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Play, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';

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

  // Reset prompt when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPrompt("Continue with the previous task");
    }
  }, [isOpen]);

  const handleResumeAgentRun = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt to resume the agent run");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 DIRECTLY RESUMING AGENT RUN - NO BACKEND BULLSHIT:", {
        organizationId,
        agentRunId,
        prompt: prompt.trim()
      });
      
      // DIRECTLY OPEN THE TRACE URL AND ATTEMPT TO INPUT TEXT
      const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
      
      // Try to use automation to input text directly into the trace page
      try {
        console.log("🤖 Attempting to automate text input into trace page");
        
        // Open the trace page
        const traceWindow = window.open(chatUrl, '_blank', 'noopener,noreferrer');
        
        if (traceWindow) {
          // Wait a moment for the page to load, then try to input text
          setTimeout(async () => {
            try {
              // Use postMessage to communicate with the trace page
              traceWindow.postMessage({
                type: 'RESUME_AGENT_RUN',
                prompt: prompt.trim(),
                agentRunId: agentRunId
              }, 'https://codegen.com');
              
              console.log("📤 Sent message to trace window to input text");
              
            } catch (automationError) {
              console.error("❌ Failed to automate text input:", automationError);
            }
          }, 2000); // Wait 2 seconds for page to load
        }
        
        // Also copy to clipboard as backup
        await navigator.clipboard.writeText(prompt.trim());
        
        toast.success(
          `🚀 Opened agent trace and attempting to input text automatically. ` +
          `Prompt also copied to clipboard as backup.`
        );
        
      } catch (automationError) {
        console.error("❌ Automation failed, falling back to clipboard:", automationError);
        
        // Fallback: just open URL and copy to clipboard
        window.open(chatUrl, '_blank', 'noopener,noreferrer');
        
        try {
          await navigator.clipboard.writeText(prompt.trim());
          toast.success(
            "Opened agent trace in new tab and copied prompt to clipboard. " +
            "Please paste the prompt manually."
          );
        } catch (clipboardError) {
          console.error("Failed to copy to clipboard:", clipboardError);
          toast.success(
            "Opened agent trace in new tab. " +
            "Please enter your prompt manually: " + prompt.trim()
          );
        }
      }
      
      // Update local cache to reflect ACTIVE status
      try {
        const { getAgentRunCache } = await import('../storage/agentRunCache');
        const cache = getAgentRunCache();
        
        // Try to get the agent run details and update status
        const agentRunDetails = await cache.getAgentRun(organizationId, agentRunId);
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
      
      // Reset state and trigger refresh
      setPrompt("Continue with the previous task");
      onResumed?.(); // This will refresh the dashboard to show active state
      onClose();
      
    } catch (error: any) {
      console.error("❌ Resume failed:", error);
      toast.error(`Failed to resume agent run: ${error.message}`);
      
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
            <div className="p-2 bg-blue-600 rounded-lg">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Resume Agent Run #{agentRunId}
              </h2>
              <p className="text-sm text-gray-400">
                Enter a prompt to continue this agent run
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                💡 <strong>Resume Instructions:</strong> Enter a prompt to continue this agent run.
                The trace page will open automatically and attempt to input your text.
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Resume Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your prompt to continue the agent run..."
              className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Press Cmd/Ctrl + Enter to resume</span>
              <span>{prompt.length} characters</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <ExternalLink className="w-4 h-4" />
            <span>Will open trace page and input text automatically</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleResumeAgentRun}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Resuming...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume Agent Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

