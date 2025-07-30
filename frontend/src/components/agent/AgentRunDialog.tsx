import React, { useState } from 'react';
import { X, Play, Loader2, FileText } from 'lucide-react';
import { AgentRunDialogProps } from '../../types';

export const AgentRunDialog: React.FC<AgentRunDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  project
}) => {
  const [target, setTarget] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (target.trim()) {
      // Combine planning statement with user target
      const planningStatement = project?.settings?.planningStatement || '';
      const fullPrompt = planningStatement 
        ? `Project='${project.repository.name}'\n\nPlanning Context:\n${planningStatement}\n\nTarget: ${target.trim()}`
        : `Project='${project?.repository.name}'\n\nTarget: ${target.trim()}`;
      
      onSubmit(fullPrompt);
      setTarget('');
    }
  };

  const handleClose = () => {
    setTarget('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Dialog */}
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Agent Run - {project?.repository.name}
              </h2>
              {project?.settings?.planningStatement && (
                <p className="text-sm text-gray-600 mt-1">
                  Planning statement configured
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Planning Statement Preview */}
            {project?.settings?.planningStatement && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Planning Statement</span>
                </div>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {project.settings.planningStatement.length > 150 
                    ? `${project.settings.planningStatement.substring(0, 150)}...`
                    : project.settings.planningStatement
                  }
                </p>
              </div>
            )}

            <div className="mb-4">
              <label 
                htmlFor="target" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Target / Goal
              </label>
              <textarea
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Describe what you want the agent to accomplish...\\n\\nExample:\\n- Add user authentication to the login page\\n- Fix the responsive design issues\\n- Implement a new feature for data export"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={6}
                disabled={isLoading}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Be specific about what you want to achieve. The agent will use this along with your project's planning statement to create a comprehensive plan.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!target.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Agent Run
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
