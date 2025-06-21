import React, { useState, useEffect } from 'react';
import { Activity, Eye, Clock, CheckCircle, XCircle, AlertCircle, Pause, Square } from 'lucide-react';
import { getAgentRunCache } from '../storage/agentRunCache';
import { getBackgroundMonitoringService } from '../utils/backgroundMonitoring';
import { AgentRunStatus } from '../api/types';

interface MonitoringStats {
  totalTracked: number;
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  pausedRuns: number;
  organizations: number;
  isMonitoringActive: boolean;
  lastUpdate: string;
}

interface StatusBreakdown {
  [key: string]: {
    count: number;
    color: string;
    icon: React.ComponentType<any>;
  };
}

export function MonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats>({
    totalTracked: 0,
    activeRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    cancelledRuns: 0,
    pausedRuns: 0,
    organizations: 0,
    isMonitoringActive: false,
    lastUpdate: new Date().toISOString(),
  });

  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({});
  const [isLoading, setIsLoading] = useState(true);

  const cache = getAgentRunCache();
  const backgroundMonitoring = getBackgroundMonitoringService();

  const loadMonitoringStats = async () => {
    try {
      setIsLoading(true);
      
      // Get all tracked organizations
      const trackedOrgs = await cache.getTrackedOrganizations();
      
      let totalTracked = 0;
      let activeRuns = 0;
      let completedRuns = 0;
      let failedRuns = 0;
      let cancelledRuns = 0;
      let pausedRuns = 0;
      const statusCounts: { [key: string]: number } = {};

      // Aggregate stats from all organizations
      for (const orgId of trackedOrgs) {
        const runs = await cache.getAgentRuns(orgId);
        totalTracked += runs.length;

        runs.forEach(run => {
          const status = run.status.toLowerCase();
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          switch (status) {
            case 'active':
            case 'running':
              activeRuns++;
              break;
            case 'complete':
            case 'completed':
              completedRuns++;
              break;
            case 'failed':
            case 'error':
              failedRuns++;
              break;
            case 'cancelled':
              cancelledRuns++;
              break;
            case 'paused':
              pausedRuns++;
              break;
          }
        });
      }

      // Create status breakdown with icons and colors
      const breakdown: StatusBreakdown = {};
      Object.entries(statusCounts).forEach(([status, count]) => {
        let color = 'text-gray-400';
        let icon = AlertCircle;

        switch (status) {
          case 'active':
          case 'running':
            color = 'text-blue-400';
            icon = Activity;
            break;
          case 'complete':
          case 'completed':
            color = 'text-green-400';
            icon = CheckCircle;
            break;
          case 'failed':
          case 'error':
            color = 'text-red-400';
            icon = XCircle;
            break;
          case 'cancelled':
            color = 'text-gray-400';
            icon = Square;
            break;
          case 'paused':
            color = 'text-yellow-400';
            icon = Pause;
            break;
          case 'pending':
            color = 'text-orange-400';
            icon = Clock;
            break;
        }

        breakdown[status] = { count, color, icon };
      });

      setStats({
        totalTracked,
        activeRuns,
        completedRuns,
        failedRuns,
        cancelledRuns,
        pausedRuns,
        organizations: trackedOrgs.length,
        isMonitoringActive: backgroundMonitoring.isMonitoring(),
        lastUpdate: new Date().toISOString(),
      });

      setStatusBreakdown(breakdown);
    } catch (error) {
      console.error('Error loading monitoring stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadMonitoringStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-5 w-5 text-purple-400 animate-pulse" />
          <span className="text-gray-300">Loading monitoring dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Eye className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Monitoring Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${stats.isMonitoringActive ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-sm ${stats.isMonitoringActive ? 'text-green-400' : 'text-red-400'}`}>
            {stats.isMonitoringActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Active</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.activeRuns}</div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-gray-400 text-sm">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.completedRuns}</div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="text-gray-400 text-sm">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.failedRuns}</div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Total Tracked</span>
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.totalTracked}</div>
        </div>
      </div>

      {/* Detailed Status Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Status Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(statusBreakdown).map(([status, data]) => {
            const Icon = data.icon;
            return (
              <div key={status} className="bg-gray-900/30 rounded-lg p-3 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${data.color}`} />
                    <span className="text-gray-300 text-sm capitalize">{status}</span>
                  </div>
                  <span className={`font-bold ${data.color}`}>{data.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Info */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Organizations Monitored:</span>
            <span className="ml-2 text-white font-medium">{stats.organizations}</span>
          </div>
          <div>
            <span className="text-gray-400">Monitoring Status:</span>
            <span className={`ml-2 font-medium ${stats.isMonitoringActive ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isMonitoringActive ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Last Updated:</span>
            <span className="ml-2 text-white">
              {new Date(stats.lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

