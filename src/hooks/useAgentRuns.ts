import { useState, useEffect, useCallback, useMemo } from "react";
import { showToast, ToastStyle } from "../utils/toast";
import { AgentRunResponse, AgentRunFilters, SortOptions, ListAgentRunsRequest } from "../api/types";
import { getAPIClient } from "../api/client";
import { filterAgentRuns, sortAgentRuns } from "../utils/filtering";
import { getDefaultOrganizationId } from "../utils/credentials";

interface UseAgentRunsResult {
  agentRuns: AgentRunResponse[];
  filteredRuns: AgentRunResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFilters: (filters: AgentRunFilters) => void;
  updateSort: (sort: SortOptions) => void;
  filters: AgentRunFilters;
  sortOptions: SortOptions;
  organizationId: number | null;
  setOrganizationId: (orgId: number) => void;
  addNewAgentRun: (agentRun: AgentRunResponse) => Promise<void>;
  pagination: {
    page: number;
    size: number;
    total: number;
    hasMore: boolean;
  };
  loadMore: () => Promise<void>;
}

export function useAgentRuns(): UseAgentRunsResult {
  const [agentRuns, setAgentRuns] = useState<AgentRunResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationIdState] = useState<number | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    hasMore: false,
  });
  
  // Filter and sort state
  const [filters, setFilters] = useState<AgentRunFilters>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: "created_at",
    direction: "desc",
  });

  const apiClient = getAPIClient();

  // Initialize organization ID
  useEffect(() => {
    async function initializeOrgId() {
      try {
        const defaultOrgId = await getDefaultOrganizationId();
        if (defaultOrgId) {
          setOrganizationIdState(defaultOrgId);
        }
      } catch (err) {
        console.error("Error getting default organization ID:", err);
      }
    }
    
    initializeOrgId();
  }, []);

  // Load agent runs from API
  const loadAgentRuns = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!organizationId) {
      console.log("No organization ID set, skipping load");
      return;
    }

    console.log(`Loading agent runs for organization ${organizationId}, page ${page}`);
    
    try {
      if (!append) {
        setIsLoading(true);
      }
      setError(null);

      const request: ListAgentRunsRequest = {
        page,
        size: pagination.size,
      };

      const response = await apiClient.listAgentRuns(organizationId, request);
      
      console.log(`Loaded ${response.items.length} runs from API (page ${page})`);
      
      if (append) {
        setAgentRuns(prev => [...prev, ...response.items]);
      } else {
        setAgentRuns(response.items);
      }
      
      setPagination({
        page: response.page,
        size: response.size,
        total: response.total,
        hasMore: response.has_more,
      });
      
    } catch (err) {
      console.error("Error loading agent runs:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load agent runs";
      setError(errorMessage);
      
      await showToast({
        style: ToastStyle.Failure,
        title: "Load Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organizationId, pagination.size, apiClient]);

  // Load initial data when organization ID changes
  useEffect(() => {
    if (organizationId) {
      loadAgentRuns(1, false);
    }
  }, [organizationId, loadAgentRuns]);

  // Refresh function (reload from page 1)
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAgentRuns(1, false);
  }, [loadAgentRuns]);

  // Load more function (load next page and append)
  const loadMore = useCallback(async () => {
    if (pagination.hasMore && !isLoading && !isRefreshing) {
      await loadAgentRuns(pagination.page + 1, true);
    }
  }, [pagination.hasMore, pagination.page, isLoading, isRefreshing, loadAgentRuns]);

  // Update filters
  const updateFilters = useCallback((newFilters: AgentRunFilters) => {
    setFilters(newFilters);
  }, []);

  // Update sort options
  const updateSort = useCallback((newSort: SortOptions) => {
    setSortOptions(newSort);
  }, []);

  // Set organization ID
  const setOrganizationId = useCallback((orgId: number) => {
    console.log(`Setting organization ID to: ${orgId}`);
    setOrganizationIdState(orgId);
    setAgentRuns([]);
    setError(null);
    setPagination(prev => ({ ...prev, page: 1, total: 0, hasMore: false }));
    
    // Update localStorage to persist the selection
    localStorage.setItem("defaultOrganizationId", orgId.toString());
  }, []);

  // Add new agent run immediately to state
  const addNewAgentRun = useCallback(async (agentRun: AgentRunResponse) => {
    console.log(`🔄 Adding new agent run #${agentRun.id} to state immediately`);
    
    // Add to the beginning of the list (most recent first)
    setAgentRuns(prev => [agentRun, ...prev]);
    
    // Update pagination total
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
    
    await showToast({
      style: ToastStyle.Success,
      title: "Agent Run Created",
      message: `Agent run #${agentRun.id} has been created`,
    });
  }, []);

  // Apply filters and sorting to agent runs
  const filteredRuns = useMemo(() => {
    let filtered = filterAgentRuns(agentRuns, filters);
    filtered = sortAgentRuns(filtered, sortOptions);
    return filtered;
  }, [agentRuns, filters, sortOptions]);

  return {
    agentRuns,
    filteredRuns,
    isLoading,
    isRefreshing,
    error,
    refresh,
    updateFilters,
    updateSort,
    filters,
    sortOptions,
    organizationId,
    setOrganizationId,
    addNewAgentRun,
    pagination,
    loadMore,
  };
}
