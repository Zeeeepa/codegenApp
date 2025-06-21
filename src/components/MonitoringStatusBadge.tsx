import React from 'react';
import { AgentRunResponse } from '../api/types';

interface MonitoringStatusBadgeProps {
  agentRun: AgentRunResponse;
  isMonitored?: boolean;
  className?: string;
}

export function MonitoringStatusBadge({ 
  agentRun, 
  isMonitored = true, // Default to true since we auto-monitor all runs now
  className = '' 
}: MonitoringStatusBadgeProps) {
  if (!isMonitored) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 ${className}`}>
        <span className="w-2 h-2 bg-gray-500 rounded-full mr-1.5"></span>
        Not Monitored
      </span>
    );
  }

  // Show monitoring status based on agent run status
  const getMonitoringDisplay = () => {
    switch (agentRun.status) {
      case 'running':
      case 'pending':
        return {
          color: 'bg-blue-100 text-blue-800',
          dotColor: 'bg-blue-500',
          text: 'Monitoring Active',
          icon: '👁️'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          dotColor: 'bg-green-500',
          text: 'Completed',
          icon: '✅'
        };
      case 'failed':
      case 'error':
        return {
          color: 'bg-red-100 text-red-800',
          dotColor: 'bg-red-500',
          text: 'Failed',
          icon: '❌'
        };
      case 'cancelled':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          dotColor: 'bg-yellow-500',
          text: 'Cancelled',
          icon: '🛑'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          dotColor: 'bg-gray-500',
          text: 'Monitored',
          icon: '📊'
        };
    }
  };

  const display = getMonitoringDisplay();

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${display.color} ${className}`}>
      <span className={`w-2 h-2 ${display.dotColor} rounded-full mr-1.5`}></span>
      <span className="mr-1">{display.icon}</span>
      {display.text}
    </span>
  );
}

export default MonitoringStatusBadge;

