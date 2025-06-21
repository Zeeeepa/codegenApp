import React from 'react';
import { AgentRunLogMessageType } from '../api/types';

interface LogFiltersProps {
  selectedMessageTypes: AgentRunLogMessageType[];
  onFilterChange: (messageTypes: AgentRunLogMessageType[]) => void;
  totalLogs: number;
  filteredCount: number;
}

export function LogFilters({ selectedMessageTypes, onFilterChange, totalLogs, filteredCount }: LogFiltersProps) {
  // Group message types by category
  const messageTypeGroups = {
    'Plan Agent': [
      AgentRunLogMessageType.ACTION,
      AgentRunLogMessageType.PLAN_EVALUATION,
      AgentRunLogMessageType.FINAL_ANSWER,
      AgentRunLogMessageType.ERROR,
      AgentRunLogMessageType.USER_MESSAGE,
      AgentRunLogMessageType.USER_GITHUB_ISSUE_COMMENT,
    ],
    'PR Agent': [
      AgentRunLogMessageType.INITIAL_PR_GENERATION,
      AgentRunLogMessageType.DETECT_PR_ERRORS,
      AgentRunLogMessageType.FIX_PR_ERRORS,
      AgentRunLogMessageType.PR_CREATION_FAILED,
      AgentRunLogMessageType.PR_EVALUATION,
    ],
    'Other': [
      AgentRunLogMessageType.COMMIT_EVALUATION,
      AgentRunLogMessageType.AGENT_RUN_LINK,
    ],
  };

  // Handle individual message type toggle
  const handleMessageTypeToggle = (messageType: AgentRunLogMessageType) => {
    const isSelected = selectedMessageTypes.includes(messageType);
    if (isSelected) {
      onFilterChange(selectedMessageTypes.filter(type => type !== messageType));
    } else {
      onFilterChange([...selectedMessageTypes, messageType]);
    }
  };

  // Handle group toggle
  const handleGroupToggle = (groupTypes: AgentRunLogMessageType[]) => {
    const allSelected = groupTypes.every(type => selectedMessageTypes.includes(type));
    if (allSelected) {
      // Deselect all in group
      onFilterChange(selectedMessageTypes.filter(type => !groupTypes.includes(type)));
    } else {
      // Select all in group
      const newSelection = [...selectedMessageTypes];
      groupTypes.forEach(type => {
        if (!newSelection.includes(type)) {
          newSelection.push(type);
        }
      });
      onFilterChange(newSelection);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    onFilterChange([]);
  };

  // Handle select all
  const handleSelectAll = () => {
    const allTypes = Object.values(messageTypeGroups).flat();
    onFilterChange(allTypes);
  };

  // Get message type display name
  const getMessageTypeDisplayName = (messageType: AgentRunLogMessageType) => {
    return messageType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get message type color
  const getMessageTypeColor = (messageType: AgentRunLogMessageType) => {
    switch (messageType) {
      case AgentRunLogMessageType.ACTION:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case AgentRunLogMessageType.ERROR:
      case AgentRunLogMessageType.PR_CREATION_FAILED:
        return 'text-red-600 bg-red-50 border-red-200';
      case AgentRunLogMessageType.PLAN_EVALUATION:
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case AgentRunLogMessageType.FINAL_ANSWER:
        return 'text-green-600 bg-green-50 border-green-200';
      case AgentRunLogMessageType.USER_MESSAGE:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Filter by Message Type</h3>
          <p className="text-xs text-gray-500 mt-1">
            Showing {filteredCount} of {totalLogs} logs
            {selectedMessageTypes.length > 0 && ` (${selectedMessageTypes.length} filters active)`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filter Groups */}
      <div className="space-y-3">
        {Object.entries(messageTypeGroups).map(([groupName, groupTypes]) => {
          const groupSelected = groupTypes.filter(type => selectedMessageTypes.includes(type)).length;
          const allGroupSelected = groupSelected === groupTypes.length;
          const someGroupSelected = groupSelected > 0 && groupSelected < groupTypes.length;

          return (
            <div key={groupName} className="border border-gray-200 rounded-lg p-3">
              {/* Group Header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => handleGroupToggle(groupTypes)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someGroupSelected;
                      }}
                      onChange={() => {}} // Handled by button click
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <span>{groupName}</span>
                </button>
                <span className="text-xs text-gray-500">
                  {groupSelected}/{groupTypes.length}
                </span>
              </div>

              {/* Group Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {groupTypes.map((messageType) => {
                  const isSelected = selectedMessageTypes.includes(messageType);
                  return (
                    <button
                      key={messageType}
                      onClick={() => handleMessageTypeToggle(messageType)}
                      className={`text-left px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        isSelected
                          ? getMessageTypeColor(messageType)
                          : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {getMessageTypeDisplayName(messageType)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Filters Summary */}
      {selectedMessageTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMessageTypes.map((messageType) => (
            <span
              key={messageType}
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getMessageTypeColor(messageType)}`}
            >
              {getMessageTypeDisplayName(messageType)}
              <button
                onClick={() => handleMessageTypeToggle(messageType)}
                className="ml-1 hover:text-gray-700"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

