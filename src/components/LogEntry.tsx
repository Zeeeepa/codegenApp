import React, { useState } from 'react';
import { AgentRunLog, AgentRunLogMessageType } from '../api/types';

interface LogEntryProps {
  log: AgentRunLog;
}

export function LogEntry({ log }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get message type styling
  const getMessageTypeStyle = (messageType: AgentRunLogMessageType) => {
    switch (messageType) {
      case AgentRunLogMessageType.ACTION:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case AgentRunLogMessageType.ERROR:
        return 'bg-red-100 text-red-800 border-red-200';
      case AgentRunLogMessageType.PLAN_EVALUATION:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case AgentRunLogMessageType.FINAL_ANSWER:
        return 'bg-green-100 text-green-800 border-green-200';
      case AgentRunLogMessageType.USER_MESSAGE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case AgentRunLogMessageType.INITIAL_PR_GENERATION:
      case AgentRunLogMessageType.DETECT_PR_ERRORS:
      case AgentRunLogMessageType.FIX_PR_ERRORS:
      case AgentRunLogMessageType.PR_EVALUATION:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case AgentRunLogMessageType.PR_CREATION_FAILED:
        return 'bg-red-100 text-red-800 border-red-200';
      case AgentRunLogMessageType.COMMIT_EVALUATION:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case AgentRunLogMessageType.AGENT_RUN_LINK:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get message type icon
  const getMessageTypeIcon = (messageType: AgentRunLogMessageType) => {
    switch (messageType) {
      case AgentRunLogMessageType.ACTION:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case AgentRunLogMessageType.ERROR:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case AgentRunLogMessageType.PLAN_EVALUATION:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case AgentRunLogMessageType.FINAL_ANSWER:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case AgentRunLogMessageType.USER_MESSAGE:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format JSON for display
  const formatJSON = (obj: any) => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, null, 2);
  };

  // Check if log has expandable content
  const hasExpandableContent = () => {
    return log.tool_input || log.tool_output || (log.observation && typeof log.observation === 'object');
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Message Type Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMessageTypeStyle(log.message_type)}`}>
              {getMessageTypeIcon(log.message_type)}
              <span className="ml-1">{log.message_type}</span>
            </span>
            
            {/* Tool Name */}
            {log.tool_name && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {log.tool_name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Timestamp */}
            <span className="text-xs text-gray-500">
              {formatTimestamp(log.created_at)}
            </span>
            
            {/* Expand/Collapse Button */}
            {hasExpandableContent() && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {/* Thought */}
        {log.thought && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Thought:</h4>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.thought}</p>
          </div>
        )}

        {/* Observation */}
        {log.observation && (
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Observation:</h4>
            <div className="text-sm text-gray-900">
              {typeof log.observation === 'string' ? (
                <p className="whitespace-pre-wrap">{log.observation}</p>
              ) : (
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                  {formatJSON(log.observation)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Expandable Content */}
        {isExpanded && hasExpandableContent() && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {/* Tool Input */}
            {log.tool_input && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Tool Input:</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                  {formatJSON(log.tool_input)}
                </pre>
              </div>
            )}

            {/* Tool Output */}
            {log.tool_output && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Tool Output:</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border">
                  {formatJSON(log.tool_output)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

