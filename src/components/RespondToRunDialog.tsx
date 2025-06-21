import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Dialog } from './Dialog';
import { CachedAgentRun } from '../api/types';

interface RespondToRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  run: CachedAgentRun | null;
  onSendResponse: (runId: number, prompt: string) => Promise<void>;
}

export function RespondToRunDialog({ isOpen, onClose, run, onSendResponse }: RespondToRunDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!run || !prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendResponse(run.id, prompt.trim());
      setPrompt('');
      onClose();
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPrompt('');
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={`Respond to Agent Run #${run?.id || 'Unknown'}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Run Context */}
        {run && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Run ID:</span>
                <span className="text-white font-mono">#{run.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">{run.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Organization:</span>
                <span className="text-white">{run.organization_id}</span>
              </div>
            </div>
            
            {/* Show last result if available */}
            {run.result && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Last Response</h4>
                <div className="bg-gray-900 rounded p-3 border border-gray-600">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                    {run.result.length > 300 ? `${run.result.substring(0, 300)}...` : run.result}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="response-prompt" className="block text-sm font-medium text-gray-300 mb-2">
              Your Response
            </label>
            <textarea
              id="response-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Continue the conversation with the agent..."
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              This will continue the conversation thread with the agent.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || isSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
