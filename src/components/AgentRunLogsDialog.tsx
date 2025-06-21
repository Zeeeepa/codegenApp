import React, { useState, useEffect } from 'react';
import { X, Clock, Tool, Brain, AlertCircle, CheckCircle, MessageSquare, GitPullRequest, GitCommit, Link } from 'lucide-react';
import { AgentRunResponse, AgentRunLog, AgentRunLogType, AgentRunWithLogsResponse } from '../api/types';
import { apiClient } from '../api/client';
import { showToast, ToastStyle } from '../utils/toast';
import { LoadingSpinner } from './LoadingSpinner';

interface AgentRunLogsDialogProps {
  agentRun: AgentRunResponse;
  organizationId: number;
  isOpen: boolean;
  onClose: () => void;
}

const getLogTypeIcon = (messageType: AgentRunLogType) => {
  switch (messageType) {
    case AgentRunLogType.ACTION:
      return <Tool className="w-4 h-4 text-blue-400" />;
    case AgentRunLogType.PLAN_EVALUATION:
      return <Brain className="w-4 h-4 text-purple-400" />;
    case AgentRunLogType.FINAL_ANSWER:
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case AgentRunLogType.ERROR:
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case AgentRunLogType.USER_MESSAGE:
    case AgentRunLogType.USER_GITHUB_ISSUE_COMMENT:
      return <MessageSquare className="w-4 h-4 text-yellow-400" />;
    case AgentRunLogType.INITIAL_PR_GENERATION:
    case AgentRunLogType.DETECT_PR_ERRORS:
    case AgentRunLogType.FIX_PR_ERRORS:
    case AgentRunLogType.PR_CREATION_FAILED:
    case AgentRunLogType.PR_EVALUATION:
      return <GitPullRequest className="w-4 h-4 text-orange-400" />;
    case AgentRunLogType.COMMIT_EVALUATION:
      return <GitCommit className="w-4 h-4 text-indigo-400" />;
    case AgentRunLogType.AGENT_RUN_LINK:
      return <Link className="w-4 h-4 text-cyan-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getLogTypeColor = (messageType: AgentRunLogType) => {
  switch (messageType) {
    case AgentRunLogType.ACTION:
      return 'border-blue-500/20 bg-blue-500/5';
    case AgentRunLogType.PLAN_EVALUATION:
      return 'border-purple-500/20 bg-purple-500/5';
    case AgentRunLogType.FINAL_ANSWER:
      return 'border-green-500/20 bg-green-500/5';
    case AgentRunLogType.ERROR:
      return 'border-red-500/20 bg-red-500/5';
    case AgentRunLogType.USER_MESSAGE:
    case AgentRunLogType.USER_GITHUB_ISSUE_COMMENT:
      return 'border-yellow-500/20 bg-yellow-500/5';
    case AgentRunLogType.INITIAL_PR_GENERATION:
    case AgentRunLogType.DETECT_PR_ERRORS:
    case AgentRunLogType.FIX_PR_ERRORS:
    case AgentRunLogType.PR_CREATION_FAILED:
    case AgentRunLogType.PR_EVALUATION:
      return 'border-orange-500/20 bg-orange-500/5';
    case AgentRunLogType.COMMIT_EVALUATION:
      return 'border-indigo-500/20 bg-indigo-500/5';
    case AgentRunLogType.AGENT_RUN_LINK:
      return 'border-cyan-500/20 bg-cyan-500/5';
    default:
      return 'border-gray-500/20 bg-gray-500/5';
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const formatJSON = (obj: any) => {
  if (typeof obj === 'string') return obj;
  if (obj === null || obj === undefined) return '';
  return JSON.stringify(obj, null, 2);
};

export const AgentRunLogsDialog: React.FC<AgentRunLogsDialogProps> = ({
  agentRun,
  organizationId,
  isOpen,
  onClose,
}) => {
  const [logsData, setLogsData] = useState<AgentRunWithLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLogTypes, setSelectedLogTypes] = useState<Set<AgentRunLogType>>(new Set());

  const loadLogs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const skip = (page - 1) * 50;
      const response = await apiClient.getAgentRunLogs(organizationId, agentRun.id, skip, 50);
      setLogsData(response);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load logs';
      setError(errorMessage);
      showToast('Failed to load agent run logs', ToastStyle.Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs(1);
    }
  }, [isOpen, agentRun.id, organizationId]);

  const filteredLogs = logsData?.logs.filter(log => 
    selectedLogTypes.size === 0 || selectedLogTypes.has(log.message_type)
  ) || [];

  const uniqueLogTypes = Array.from(new Set(logsData?.logs.map(log => log.message_type) || []));

  const toggleLogType = (logType: AgentRunLogType) => {
    const newSelected = new Set(selectedLogTypes);
    if (newSelected.has(logType)) {
      newSelected.delete(logType);
    } else {
      newSelected.add(logType);
    }
    setSelectedLogTypes(newSelected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Agent Run Logs</h2>
            <p className="text-gray-400 text-sm mt-1">
              Agent Run #{agentRun.id} • {formatTimestamp(agentRun.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        {uniqueLogTypes.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-400 mr-2">Filter by type:</span>
              {uniqueLogTypes.map(logType => (
                <button
                  key={logType}
                  onClick={() => toggleLogType(logType)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedLogTypes.has(logType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {logType.replace(/_/g, ' ')}
                </button>
              ))}
              {selectedLogTypes.size > 0 && (
                <button
                  onClick={() => setSelectedLogTypes(new Set())}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 font-medium">Failed to load logs</p>
                <p className="text-gray-400 text-sm mt-1">{error}</p>
                <button
                  onClick={() => loadLogs(currentPage)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : logsData && logsData.logs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No logs available</p>
                <p className="text-gray-500 text-sm mt-1">
                  This agent run doesn't have any execution logs yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getLogTypeColor(log.message_type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getLogTypeIcon(log.message_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-white">
                          {log.message_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(log.created_at)}
                        </span>
                        {log.tool_name && (
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {log.tool_name}
                          </span>
                        )}
                      </div>

                      {log.thought && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-1">Thought:</h4>
                          <p className="text-sm text-gray-200 whitespace-pre-wrap">{log.thought}</p>
                        </div>
                      )}

                      {log.tool_input && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-1">Tool Input:</h4>
                          <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto">
                            {formatJSON(log.tool_input)}
                          </pre>
                        </div>
                      )}

                      {log.tool_output && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-1">Tool Output:</h4>
                          <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto">
                            {formatJSON(log.tool_output)}
                          </pre>
                        </div>
                      )}

                      {log.observation && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-1">Observation:</h4>
                          <div className="text-sm text-gray-200">
                            {typeof log.observation === 'string' ? (
                              <p className="whitespace-pre-wrap">{log.observation}</p>
                            ) : (
                              <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                                {formatJSON(log.observation)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with pagination */}
        {logsData && logsData.pages > 1 && (
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {filteredLogs.length} of {logsData.total_logs} logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadLogs(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} of {logsData.pages}
              </span>
              <button
                onClick={() => loadLogs(currentPage + 1)}
                disabled={currentPage >= logsData.pages}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

