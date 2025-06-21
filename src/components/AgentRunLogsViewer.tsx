import React, { useState, useEffect } from 'react';
import { AgentRunWithLogsResponse, AgentRunLog, AgentRunLogMessageType } from '../api/types';
import { getAPIClient } from '../api/client';
import { showToast, ToastStyle } from '../utils/toast';
import { LogEntry } from './LogEntry';
import { LogFilters } from './LogFilters';
import { LogPagination } from './LogPagination';

interface AgentRunLogsViewerProps {
  organizationId: number;
  agentRunId: number;
  onClose?: () => void;
}

export function AgentRunLogsViewer({ organizationId, agentRunId, onClose }: AgentRunLogsViewerProps) {
  const [logsData, setLogsData] = useState<AgentRunWithLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedMessageTypes, setSelectedMessageTypes] = useState<AgentRunLogMessageType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentRunLog[]>([]);

  const apiClient = getAPIClient();

  // Load logs data
  const loadLogs = async (page: number = 1, limit: number = 50) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const skip = (page - 1) * limit;
      const response = await apiClient.getAgentRunLogs(organizationId, agentRunId, {
        skip,
        limit
      });
      
      setLogsData(response);
      setCurrentPage(page);
      setPageSize(limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agent run logs';
      setError(errorMessage);
      await showToast({
        style: ToastStyle.Failure,
        title: 'Failed to Load Logs',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logs based on selected message types
  useEffect(() => {
    if (!logsData) {
      setFilteredLogs([]);
      return;
    }

    if (selectedMessageTypes.length === 0) {
      setFilteredLogs(logsData.logs);
    } else {
      const filtered = logsData.logs.filter(log => 
        selectedMessageTypes.includes(log.message_type)
      );
      setFilteredLogs(filtered);
    }
  }, [logsData, selectedMessageTypes]);

  // Initial load
  useEffect(() => {
    loadLogs(1, 50);
  }, [organizationId, agentRunId]);

  // Handle page change
  const handlePageChange = (page: number) => {
    loadLogs(page, pageSize);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    loadLogs(1, newPageSize);
  };

  // Handle filter change
  const handleFilterChange = (messageTypes: AgentRunLogMessageType[]) => {
    setSelectedMessageTypes(messageTypes);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadLogs(currentPage, pageSize);
  };

  if (isLoading && !logsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading agent run logs...</span>
      </div>
    );
  }

  if (error && !logsData) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Logs</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleRefresh}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!logsData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Agent Run Logs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Agent Run #{agentRunId} • {logsData.total_logs} total logs
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg className={`-ml-0.5 mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <LogFilters
          selectedMessageTypes={selectedMessageTypes}
          onFilterChange={handleFilterChange}
          totalLogs={logsData.total_logs}
          filteredCount={filteredLogs.length}
        />
      </div>

      {/* Logs Content */}
      <div className="px-6 py-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedMessageTypes.length > 0 
                ? 'Try adjusting your filters to see more logs.'
                : 'This agent run has no logs yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <LogEntry
                key={`${log.agent_run_id}-${log.created_at}-${index}`}
                log={log}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {logsData.total_logs > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <LogPagination
            currentPage={currentPage}
            totalPages={logsData.pages}
            pageSize={pageSize}
            totalItems={logsData.total_logs}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}

