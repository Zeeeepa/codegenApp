import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AgentRunWithLogsResponse, 
  AgentRunLog, 
  AgentRunLogMessageType,
  GetAgentRunLogsRequest 
} from '../api/types';
import { getAPIClient } from '../api/client';
import { showToast, ToastStyle } from '../utils/toast';

interface UseAgentRunLogsOptions {
  organizationId: number;
  agentRunId: number;
  initialPageSize?: number;
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
}

interface UseAgentRunLogsReturn {
  // Data
  logsData: AgentRunWithLogsResponse | null;
  filteredLogs: AgentRunLog[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalLogs: number;
  
  // Filtering
  selectedMessageTypes: AgentRunLogMessageType[];
  availableMessageTypes: AgentRunLogMessageType[];
  
  // Actions
  loadLogs: (page?: number, size?: number) => Promise<void>;
  refresh: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setMessageTypeFilters: (types: AgentRunLogMessageType[]) => void;
  clearFilters: () => void;
  
  // Utilities
  hasLogs: boolean;
  hasFilters: boolean;
  isLastPage: boolean;
  isFirstPage: boolean;
}

export function useAgentRunLogs({
  organizationId,
  agentRunId,
  initialPageSize = 50,
  autoRefresh = false,
  autoRefreshInterval = 30000, // 30 seconds
}: UseAgentRunLogsOptions): UseAgentRunLogsReturn {
  
  // Core state
  const [logsData, setLogsData] = useState<AgentRunWithLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Filtering state
  const [selectedMessageTypes, setSelectedMessageTypes] = useState<AgentRunLogMessageType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentRunLog[]>([]);
  
  // Refs for cleanup
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const apiClient = getAPIClient();
  
  // Load logs from API
  const loadLogs = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const isInitialLoad = !logsData;
      const isRefresh = page === currentPage && size === pageSize && logsData;
      
      if (isInitialLoad) {
        setIsLoading(true);
      } else if (isRefresh) {
        setIsRefreshing(true);
      }
      
      setError(null);
      
      const skip = (page - 1) * size;
      const request: GetAgentRunLogsRequest = { skip, limit: size };
      
      const response = await apiClient.getAgentRunLogs(organizationId, agentRunId, request);
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      setLogsData(response);
      setCurrentPage(page);
      setPageSize(size);
      
    } catch (err) {
      // Don't show error if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agent run logs';
      setError(errorMessage);
      
      await showToast({
        style: ToastStyle.Failure,
        title: 'Failed to Load Logs',
        message: errorMessage,
      });
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [organizationId, agentRunId, currentPage, pageSize, logsData, apiClient]);
  
  // Refresh current page
  const refresh = useCallback(async () => {
    await loadLogs(currentPage, pageSize);
  }, [loadLogs, currentPage, pageSize]);
  
  // Set page with loading
  const setPage = useCallback((page: number) => {
    if (page !== currentPage && page >= 1 && (!logsData || page <= logsData.pages)) {
      loadLogs(page, pageSize);
    }
  }, [currentPage, pageSize, logsData, loadLogs]);
  
  // Set page size and reset to first page
  const setPageSizeHandler = useCallback((size: number) => {
    if (size !== pageSize) {
      loadLogs(1, size);
    }
  }, [pageSize, loadLogs]);
  
  // Set message type filters
  const setMessageTypeFilters = useCallback((types: AgentRunLogMessageType[]) => {
    setSelectedMessageTypes(types);
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedMessageTypes([]);
  }, []);
  
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
  
  // Get available message types from current logs
  const availableMessageTypes = logsData 
    ? Array.from(new Set(logsData.logs.map(log => log.message_type)))
    : [];
  
  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && logsData) {
      autoRefreshRef.current = setInterval(() => {
        refresh();
      }, autoRefreshInterval);
      
      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
          autoRefreshRef.current = null;
        }
      };
    }
  }, [autoRefresh, autoRefreshInterval, refresh, logsData]);
  
  // Initial load
  useEffect(() => {
    loadLogs(1, initialPageSize);
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [organizationId, agentRunId]); // Only re-run if these change
  
  // Computed values
  const totalPages = logsData?.pages || 0;
  const totalLogs = logsData?.total_logs || 0;
  const hasLogs = totalLogs > 0;
  const hasFilters = selectedMessageTypes.length > 0;
  const isLastPage = currentPage >= totalPages;
  const isFirstPage = currentPage <= 1;
  
  return {
    // Data
    logsData,
    filteredLogs,
    
    // Loading states
    isLoading,
    isRefreshing,
    error,
    
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    totalLogs,
    
    // Filtering
    selectedMessageTypes,
    availableMessageTypes,
    
    // Actions
    loadLogs,
    refresh,
    setPage,
    setPageSize: setPageSizeHandler,
    setMessageTypeFilters,
    clearFilters,
    
    // Utilities
    hasLogs,
    hasFilters,
    isLastPage,
    isFirstPage,
  };
}

