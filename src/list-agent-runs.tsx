import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  RefreshCw, 
  Filter, 
  Plus, 
  AlertCircle,
  CheckCircle,
  Settings
} from "lucide-react";
import { useAgentRunSelection } from "./contexts/AgentRunSelectionContext";
import { AgentRunCard } from "./components/AgentRunCard";
import { useCachedAgentRuns } from "./hooks/useCachedAgentRuns";
import { getAPIClient } from "./api/client";
import { getAgentRunCache } from "./storage/agentRunCache";
import { AgentRunStatus, AgentRunFilters, CachedAgentRun } from "./api/types";
import { getDateRanges, getStatusFilterOptions, hasActiveFilters, clearFilters } from "./utils/filtering";
import { SyncStatus } from "./storage/cacheTypes";
import { useDialog } from "./contexts/DialogContext";

export default function ListAgentRuns() {
  const {
    filteredRuns,
    isLoading,
    isRefreshing,
    error,
    syncStatus,
    refresh,
    updateFilters,
    filters,
    organizationId,
  } = useCachedAgentRuns();

  const selection = useAgentRunSelection();
  const [searchText, setSearchText] = useState("");
  const [dateRanges] = useState(() => getDateRanges());
  const [statusFilterOptions, setStatusFilterOptions] = useState(() => getStatusFilterOptions([]));
  const apiClient = getAPIClient();
  const cache = getAgentRunCache();
  const { openDialog } = useDialog();

  // Initialize component and update status filter options when runs change
  useEffect(() => {
    // Component initialization logic
    console.log('Agent runs component initialized');
    console.log('Current filters:', filters as AgentRunFilters);
  }, [filters]);

  // Update status filter options when filteredRuns change
  useEffect(() => {
    if (filteredRuns.length > 0) {
      setStatusFilterOptions(getStatusFilterOptions(filteredRuns));
    }
  }, [filteredRuns]);

  // Update search filter when search text changes
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    updateFilters({
      ...filters,
      searchQuery: text,
    });
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Stop an agent run
  const stopAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    const confirmed = window.confirm(`Are you sure you want to stop agent run #${agentRunId}?`);
    
    if (!confirmed) return;

    try {
      await apiClient.stopAgentRun(organizationId, { agent_run_id: agentRunId });
      
      toast.success(`Agent run #${agentRunId} has been stopped`);

      // Refresh to get updated status
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop agent run");
    }
  };

  // Resume an agent run
  const resumeAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    try {
      // For resume, we need a prompt - this is a simplified version
      // In a real implementation, you might want to show a form for the resume prompt
      await apiClient.resumeAgentRun(organizationId, {
        agent_run_id: agentRunId,
        prompt: "Continue with the previous task",
      });

      toast.success(`Agent run #${agentRunId} has been resumed`);

      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resume agent run");
    }
  };



  // Delete an agent run
  const deleteAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    if (!window.confirm(`Are you sure you want to delete agent run #${agentRunId}? This will remove it from your local cache.`)) return;

    try {
      // Remove from cache
      await cache.removeAgentRun(organizationId, agentRunId);
      
      toast.success(`Agent run #${agentRunId} has been removed`);

      // Refresh to update the list
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete agent run");
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    updateFilters(clearFilters());
    setSearchText("");
  };

  // Filter by status
  const filterByStatus = (status: AgentRunStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilters({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  // Get sync status display
  const getSyncStatusAccessory = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return { icon: RefreshCw, tooltip: "Syncing..." };
      case SyncStatus.ERROR:
        return { icon: AlertCircle, tooltip: "Sync failed" };
      case SyncStatus.SUCCESS:
        return { icon: CheckCircle, tooltip: "Synced" };
      default:
        return undefined;
    }
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Agent Runs</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={refresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Header with search and filters */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">Agent Runs</h1>
              {(() => {
                const syncStatusDisplay = getSyncStatusAccessory();
                if (syncStatusDisplay) {
                  const { icon: SyncIcon, tooltip } = syncStatusDisplay;
                  return (
                    <div className="flex items-center" title={tooltip}>
                      <SyncIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => openDialog('create-run')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Run
              </button>
              <button
                onClick={() => openDialog('settings')}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              {selection.hasSelection && (
                <button
                  onClick={selection.clearSelection}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                  title="Clear selection"
                >
                  Clear ({selection.selectionCount})
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search agent runs..."
                value={searchText}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={filters.status || 'all'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    updateFilters({ ...filters, status: undefined });
                  } else {
                    filterByStatus(e.target.value as AgentRunStatus);
                  }
                }}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                {statusFilterOptions.map(({ status, count, label }) => (
                  <option key={status} value={status}>
                    {label} ({count})
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters(filters) && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </button>
            )}
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Date Range Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date Range</label>
            <select
              onChange={(e) => {
                const selectedRange = e.target.value;
                if (selectedRange === 'all') {
                  updateFilters({ ...filters, dateRange: undefined });
                } else {
                  const range = dateRanges[selectedRange as keyof typeof dateRanges];
                  if (range) {
                    updateFilters({ ...filters, dateRange: range });
                  }
                }
              }}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last30Days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading agent runs...</p>
          </div>
        )}

        {/* Empty state */}
        {filteredRuns.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              {hasActiveFilters(filters) ? <Filter className="h-12 w-12" /> : <Plus className="h-12 w-12" />}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {hasActiveFilters(filters) ? "No Matching Agent Runs" : "No Agent Runs"}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters(filters)
                ? "Try adjusting your search or filters"
                : "Create your first agent run to get started"}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => openDialog('create-run')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Agent Run
              </button>
              {hasActiveFilters(filters) && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Agent runs list */}
        {filteredRuns.length > 0 && !isLoading && (
          <div className="space-y-4 p-6">
            {filteredRuns.map((run) => {
              // Convert AgentRunResponse to CachedAgentRun for the card
              const cachedRun: CachedAgentRun = {
                ...run,
                lastUpdated: new Date().toISOString(),
                organizationName: undefined, // Will be populated by cache if available
                isPolling: run.status === AgentRunStatus.ACTIVE || run.status === AgentRunStatus.EVALUATION
              };

              return (
                <AgentRunCard
                  key={run.id}
                  run={cachedRun}
                  onStop={stopAgentRun}
                  onResume={resumeAgentRun}
                  onDelete={deleteAgentRun}
                  onCopyUrl={copyToClipboard}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
