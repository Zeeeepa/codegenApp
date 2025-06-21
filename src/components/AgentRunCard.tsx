import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  ExternalLink, 
  Trash2, 
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  MessageSquare,
  ScrollText
} from 'lucide-react';
import { CachedAgentRun, AgentRunStatus } from '../api/types';
import { useAgentRunSelection } from '../contexts/AgentRunSelectionContext';
import { AgentRunResponseModal } from './AgentRunResponseModal';
import { RespondToRunDialog } from './RespondToRunDialog';
import { AgentRunLogsDialog } from './AgentRunLogsDialog';

interface AgentRunCardProps {
  run: CachedAgentRun;
  onStop: (agentRunId: number) => void;
  onResume: (agentRunId: number) => void;
  onDelete: (agentRunId: number) => void;
  onCopyUrl: (url: string, message: string) => void;
  onRespond: (runId: number, prompt: string) => Promise<void>;
  organizationId: number;
}

export function AgentRunCard({ run, onStop, onResume, onDelete, onCopyUrl, onRespond, organizationId }: AgentRunCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [responseModalRun, setResponseModalRun] = useState<CachedAgentRun | null>(null);
  const [respondDialogRun, setRespondDialogRun] = useState<CachedAgentRun | null>(null);
  const [logsDialogRun, setLogsDialogRun] = useState<CachedAgentRun | null>(null);
  const selection = useAgentRunSelection();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return Clock;
      case "COMPLETE":
        return CheckCircle;
      case "FAILED":
      case "ERROR":
        return XCircle;
      case "CANCELLED":
        return Square;
      case "PAUSED":
        return Pause;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-blue-400 bg-blue-900/20 border-blue-700";
      case "COMPLETE":
        return "text-green-400 bg-green-900/20 border-green-700";
      case "FAILED":
      case "ERROR":
        return "text-red-400 bg-red-900/20 border-red-700";
      case "CANCELLED":
        return "text-gray-400 bg-gray-900/20 border-gray-700";
      case "PAUSED":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-700";
      default:
        return "text-gray-400 bg-gray-900/20 border-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const StatusIcon = getStatusIcon(run.status);
  const statusColor = getStatusColor(run.status);
  const canStop = run.status === AgentRunStatus.ACTIVE;
  const canResume = run.status === AgentRunStatus.PAUSED;
  const canViewResponse = run.status === AgentRunStatus.COMPLETE && run.result;
  const isSelected = selection.isSelected(run.id);

  return (
    <>
      <div 
        className={`rounded-lg border transition-all ${
          isSelected 
            ? 'bg-blue-900/30 border-blue-500 shadow-lg' 
            : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:shadow-md'
        }`}
      >
        {/* Main Card Content */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => selection.toggleRun(run.id, run)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <StatusIcon className={`h-5 w-5 ${statusColor.split(' ')[0]}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-white">Agent Run #{run.id}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                    {run.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-gray-400">Created {formatDate(run.created_at)}</p>
                  {run.lastUpdated && (
                    <p className="text-sm text-gray-500">Updated {formatDate(run.lastUpdated)}</p>
                  )}
                  {run.organizationName && (
                    <p className="text-sm text-gray-500">Org: {run.organizationName}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Action Buttons */}
              {canViewResponse && (
                <button
                  onClick={() => setResponseModalRun(run)}
                  className="inline-flex items-center px-3 py-1.5 border border-green-600 text-sm font-medium rounded text-green-300 bg-green-900 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800"
                  title="View Response"
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => window.open(run.web_url, '_blank')}
                className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                title="Open in Browser"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              
              {/* View Logs button */}
              <button
                onClick={() => setLogsDialogRun(run)}
                className="inline-flex items-center px-3 py-1.5 border border-purple-600 text-sm font-medium rounded text-purple-300 bg-purple-900 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800"
                title="View Agent Run Logs"
              >
                <ScrollText className="h-4 w-4" />
              </button>
              
              {/* Respond button - only show for completed, failed, cancelled, or stopped runs */}
              {(run.status === AgentRunStatus.COMPLETE || 
                run.status === AgentRunStatus.FAILED ||
                run.status === AgentRunStatus.ERROR ||
                run.status === AgentRunStatus.CANCELLED ||
                run.status === AgentRunStatus.TIMEOUT ||
                run.status === AgentRunStatus.MAX_ITERATIONS_REACHED ||
                run.status === AgentRunStatus.OUT_OF_TOKENS ||
                run.status.toLowerCase() === 'complete' ||
                run.status.toLowerCase() === 'completed' ||
                run.status.toLowerCase() === 'failed' ||
                run.status.toLowerCase() === 'cancelled' ||
                run.status.toLowerCase() === 'stopped') && (
                <button
                  onClick={() => setRespondDialogRun(run)}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded text-blue-300 bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                  title="Respond to Agent Run"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}
              
              {canStop && (
                <button
                  onClick={() => onStop(run.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-600 text-sm font-medium rounded text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
                  title="Stop Agent Run"
                >
                  <Square className="h-4 w-4" />
                </button>
              )}
              
              {canResume && (
                <button
                  onClick={() => onResume(run.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-green-600 text-sm font-medium rounded text-green-300 bg-green-900 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800"
                  title="Resume Agent Run"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => onDelete(run.id)}
                className="inline-flex items-center px-3 py-1.5 border border-red-600 text-sm font-medium rounded text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
                title="Delete Agent Run"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                title={isExpanded ? "Collapse Details" : "Expand Details"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Run Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Run Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Run ID:</span>
                      <span className="text-white font-mono">#{run.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Organization ID:</span>
                      <span className="text-white font-mono">{run.organization_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-medium ${statusColor.split(' ')[0]}`}>{run.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white">{new Date(run.created_at).toLocaleString()}</span>
                    </div>
                    {run.lastUpdated && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Updated:</span>
                        <span className="text-white">{new Date(run.lastUpdated).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monitoring Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Monitoring Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Auto-Monitored:</span>
                      <span className="text-green-400">✓ Active</span>
                    </div>
                    {run.isPolling !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Polling:</span>
                        <span className={run.isPolling ? "text-blue-400" : "text-gray-400"}>
                          {run.isPolling ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Web URL:</span>
                      <button
                        onClick={() => onCopyUrl(run.web_url, 'URL copied')}
                        className="text-blue-400 hover:text-blue-300 underline text-xs truncate max-w-48"
                        title={run.web_url}
                      >
                        {run.web_url.replace('https://', '').substring(0, 30)}...
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Preview */}
              {run.result && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Result Preview</h4>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {run.result.length > 200 ? `${run.result.substring(0, 200)}...` : run.result}
                    </pre>
                    {run.result.length > 200 && (
                      <button
                        onClick={() => setResponseModalRun(run)}
                        className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        View Full Result
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {responseModalRun && (
        <AgentRunResponseModal
          run={responseModalRun}
          isOpen={!!responseModalRun}
          onClose={() => setResponseModalRun(null)}
        />
      )}

      {/* Respond Dialog */}
      {respondDialogRun && (
        <RespondToRunDialog
          run={respondDialogRun}
          isOpen={!!respondDialogRun}
          onClose={() => setRespondDialogRun(null)}
          onSendResponse={onRespond}
        />
      )}

      {/* Logs Dialog */}
      {logsDialogRun && (
        <AgentRunLogsDialog
          agentRun={logsDialogRun}
          organizationId={organizationId}
          isOpen={!!logsDialogRun}
          onClose={() => setLogsDialogRun(null)}
        />
      )}
    </>
  );
}
