import React, { useState, useEffect } from 'react';
import { AgentRunResponse } from '../api/types';
import { getBackgroundMonitoringService } from '../utils/backgroundMonitoring';

interface MonitoringContextPanelProps {
  agentRun: AgentRunResponse;
  organizationId: number;
  className?: string;
}

interface MonitoringInfo {
  isMonitored: boolean;
  addedToMonitoringAt?: string;
  lastChecked?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notified: boolean;
  }>;
  notificationPreferences: {
    onStatusChange: boolean;
    onCompletion: boolean;
    onError: boolean;
  };
}

export function MonitoringContextPanel({ 
  agentRun, 
  organizationId, 
  className = '' 
}: MonitoringContextPanelProps) {
  const [monitoringInfo, setMonitoringInfo] = useState<MonitoringInfo>({
    isMonitored: true, // Default to true since we auto-monitor
    statusHistory: [],
    notificationPreferences: {
      onStatusChange: true,
      onCompletion: true,
      onError: true,
    }
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load monitoring info for this agent run
    const loadMonitoringInfo = () => {
      const monitoringService = getBackgroundMonitoringService();
      
      // Since we auto-monitor all runs, set basic info
      setMonitoringInfo(prev => ({
        ...prev,
        isMonitored: true,
        addedToMonitoringAt: agentRun.created_at,
        lastChecked: new Date().toISOString(),
        statusHistory: [
          {
            status: agentRun.status,
            timestamp: agentRun.created_at,
            notified: false
          }
        ]
      }));
    };

    loadMonitoringInfo();
  }, [agentRun]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': case 'error': return '❌';
      case 'cancelled': return '🛑';
      case 'pending': return '⏳';
      default: return '📊';
    }
  };

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
      <div 
        className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-blue-400">📊</span>
          <h3 className="text-sm font-medium text-white">Monitoring Context</h3>
          {monitoringInfo.isMonitored && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-200">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
              Active
            </span>
          )}
        </div>
        <span className={`text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="space-y-4 mt-4">
            {/* Monitoring Status */}
            <div>
              <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">
                Monitoring Status
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white">
                    {monitoringInfo.isMonitored ? '✅ Monitored' : '❌ Not Monitored'}
                  </span>
                </div>
                {monitoringInfo.addedToMonitoringAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Added:</span>
                    <span className="text-white text-xs">
                      {formatTimestamp(monitoringInfo.addedToMonitoringAt)}
                    </span>
                  </div>
                )}
                {monitoringInfo.lastChecked && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Check:</span>
                    <span className="text-white text-xs">
                      {formatTimestamp(monitoringInfo.lastChecked)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            <div>
              <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">
                Status History
              </h4>
              <div className="space-y-2">
                {monitoringInfo.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span>{getStatusIcon(entry.status)}</span>
                      <span className="text-white capitalize">{entry.status}</span>
                      {entry.notified && (
                        <span className="text-xs text-blue-400">📧 Notified</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Preferences */}
            <div>
              <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">
                Notifications
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status Changes:</span>
                  <span className="text-white">
                    {monitoringInfo.notificationPreferences.onStatusChange ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Completion:</span>
                  <span className="text-white">
                    {monitoringInfo.notificationPreferences.onCompletion ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Errors:</span>
                  <span className="text-white">
                    {monitoringInfo.notificationPreferences.onError ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-monitoring Notice */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <span className="text-blue-400 mt-0.5">ℹ️</span>
                <div>
                  <p className="text-xs text-blue-200 font-medium">Auto-Monitoring Enabled</p>
                  <p className="text-xs text-blue-300 mt-1">
                    All agent runs are automatically added to monitoring when created. 
                    You'll receive notifications for status changes, completions, and errors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonitoringContextPanel;

