import { useState, useEffect, useCallback, useMemo } from "react";
import { showToast, ToastStyle } from "../utils/toast";
import { AgentRunResponse, AgentRunFilters, SortOptions } from "../api/types";
import { getAgentRunCache } from "../storage/agentRunCache";
import { getAPIClient } from "../api/client";
import { filterAgentRuns, sortAgentRuns } from "../utils/filtering";
import { getDefaultOrganizationId } from "../utils/credentials";
import { SyncStatus } from "../storage/cacheTypes";
import { getBackgroundMonitoringService } from "../utils/backgroundMonitoring";

interface UseCachedAgentRunsResult {
  agentRuns: AgentRunResponse[];
  filteredRuns: AgentRunResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  refresh: () => Promise<void>;
  updateFilters: (filters: AgentRunFilters) => void;
  updateSort: (sort: SortOptions) => void;
  filters: AgentRunFilters;
  sortOptions: SortOptions;
  organizationId: number | null;
  setOrganizationId: (orgId: number) => void;
}

export function useCachedAgentRuns(): UseCachedAgentRunsResult {
  const [agentRuns, setAgentRuns] = useState<AgentRunResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [organizationId, setOrganizationIdState] = useState<number | null>(null);
  
  // Filter and sort state
  const [filters, setFilters] = useState<AgentRunFilters>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: "created_at",
    direction: "desc",
  });

  const cache = getAgentRunCache();
  const apiClient = getAPIClient();
  const backgroundMonitoring = getBackgroundMonitoringService();

  // Initialize organization ID and start background monitoring
  useEffect(() => {
    async function initializeOrgId() {
      const defaultOrgId = await getDefaultOrganizationId();
      console.log(`Initialized organization ID: ${defaultOrgId}`);
      setOrganizationIdState(defaultOrgId);
      
      // If no default organization is set, try to get organizations and set the first one
      if (!defaultOrgId) {
        try {
          const { validateCredentials } = await import("../utils/credentials");
          const validation = await validateCredentials();
          if (validation.isValid && validation.organizations && validation.organizations.length > 0) {
            const firstOrg = validation.organizations[0];
            console.log(`No default org found, using first available: ${firstOrg.name} (${firstOrg.id})`);
            setOrganizationIdState(firstOrg.id);
            
            // Store as default for future use
            localStorage.setItem("defaultOrganizationId", firstOrg.id.toString());
            localStorage.setItem("defaultOrganization", JSON.stringify({
              id: firstOrg.id,
              name: firstOrg.name,
              settings: {
                enable_pr_creation: true,
                enable_rules_detection: true
              }
            }));
          }
        } catch (error) {
          console.error("Failed to auto-set default organization:", error);
        }
      }
    }
    initializeOrgId();

    // Start background monitoring when the hook is first used
    if (!backgroundMonitoring.isMonitoring()) {
      backgroundMonitoring.start();
    }

    // Cleanup function to stop monitoring when component unmounts
    return () => {
      // Note: We don't stop monitoring here because other components might be using it
      // The monitoring will continue running in the background
    };
  }, [backgroundMonitoring]);

  // Load cached data
  const loadCachedData = useCallback(async () => {
    if (!organizationId) {
      console.log("No organization ID set, skipping cache load");
      return;
    }

    console.log(`Loading cached data for organization ${organizationId}`);
    try {
      const cachedRuns = await cache.getAgentRuns(organizationId);
      console.log(`Loaded ${cachedRuns.length} cached runs for org ${organizationId}`);
      setAgentRuns(cachedRuns);
      
      const status = await cache.getSyncStatus(organizationId);
      setSyncStatus(status.status);
    } catch (err) {
      console.error("Error loading cached data:", err);
      setError(err instanceof Error ? err.message : "Failed to load cached data");
    }
  }, [organizationId, cache]);

  // Sync with API
  const syncWithAPI = useCallback(async (showSuccessToast = false) => {
    if (!organizationId) return;

    try {
      setIsRefreshing(true);
      setError(null);

      const syncResult = await cache.syncAgentRuns(organizationId);
      setSyncStatus(syncResult.status);

      if (syncResult.status === SyncStatus.SUCCESS) {
        const updatedRuns = await cache.getAgentRuns(organizationId);
        setAgentRuns(updatedRuns);
        
        if (showSuccessToast) {
          await showToast({
            style: ToastStyle.Success,
            title: "Agent Runs Updated",
            message: `Loaded ${updatedRuns.length} agent runs`,
          });
        }
      } else if (syncResult.error) {
        setError(syncResult.error);
        await showToast({
          style: ToastStyle.Failure,
          title: "Sync Failed",
          message: syncResult.error,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync data";
      setError(errorMessage);
      setSyncStatus(SyncStatus.ERROR);
      
      await showToast({
        style: ToastStyle.Failure,
        title: "Sync Error",
        message: errorMessage,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [organizationId, cache]);

  // Refresh function (load cache + sync)
  const refresh = useCallback(async () => {
    await loadCachedData();
    await syncWithAPI(true);
  }, [loadCachedData, syncWithAPI]);

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
    setSyncStatus(SyncStatus.IDLE);
    
    // Update localStorage to persist the selection
    localStorage.setItem("defaultOrganizationId", orgId.toString());
  }, []);

  // Initial load
  useEffect(() => {
    if (organizationId) {
      setIsLoading(true);
      loadCachedData().finally(() => {
        setIsLoading(false);
        // Background sync without showing loading state
        syncWithAPI(false);
      });
    }
  }, [organizationId, loadCachedData, syncWithAPI]);

  // Polling for active runs
  useEffect(() => {
    if (!organizationId) return;

    const pollActiveRuns = async () => {
      try {
        const pollingRuns = await cache.getPollingRuns(organizationId);
        
        if (pollingRuns.length === 0) return;

        // Update each active run
        const updatePromises = pollingRuns.map(async (run) => {
          try {
            const updatedRun = await apiClient.getAgentRun(organizationId, run.id);
            await cache.updateAgentRun(organizationId, updatedRun);
            return updatedRun;
          } catch (err) {
            console.warn(`Failed to update agent run ${run.id}:`, err);
            return run;
          }
        });

        const updatedRuns = await Promise.all(updatePromises);
        
        // Check if any runs changed status
        const statusChanged = updatedRuns.some((updated, index) => 
          updated.status !== pollingRuns[index].status
        );

        if (statusChanged) {
          // Reload all cached data to reflect changes
          await loadCachedData();
        }
      } catch (err) {
        console.error("Error polling active runs:", err);
      }
    };

    // Poll every 30 seconds for active runs
    const pollInterval = setInterval(pollActiveRuns, 30000);
    
    // Initial poll
    pollActiveRuns();

    return () => clearInterval(pollInterval);
  }, [organizationId, cache, apiClient, loadCachedData]);

  // Apply filters and sorting - memoized for performance
  const filteredRuns = useMemo(() => {
    return sortAgentRuns(
      filterAgentRuns(agentRuns, filters),
      sortOptions
    );
  }, [agentRuns, filters, sortOptions]);

  return {
    agentRuns,
    filteredRuns,
    isLoading,
    isRefreshing,
    error,
    syncStatus,
    refresh,
    updateFilters,
    updateSort,
    filters,
    sortOptions,
    organizationId,
    setOrganizationId,
  };
}
