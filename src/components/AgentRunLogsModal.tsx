import React from 'react';
import { X } from 'lucide-react';
import { AgentRunLogsViewer } from './AgentRunLogsViewer';

interface AgentRunLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  agentRunId: number;
}

export function AgentRunLogsModal({ isOpen, onClose, organizationId, agentRunId }: AgentRunLogsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-7xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Agent Run Logs - #{agentRunId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-[80vh] overflow-y-auto">
            <AgentRunLogsViewer
              organizationId={organizationId}
              agentRunId={agentRunId}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

