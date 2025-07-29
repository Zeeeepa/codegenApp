import React, { useState } from 'react';
import { 
  Play, 
  Settings, 
  Github, 
  Webhook, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { ProjectCardProps, AgentRun } from '../../types';
import { AgentRunDialog } from '../agent/AgentRunDialog';
import { ProjectSettings } from './ProjectSettings';
import { useAgentRun } from '../../hooks';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onUpdate,
  onDelete
}) => {
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { createAgentRun, isLoading } = useAgentRun();

  const handleAgentRun = async (target: string) => {
    try {
      await createAgentRun(project.id, target);
      setShowAgentDialog(false);
    } catch (error) {
      console.error('Failed to create agent run:', error);
    }
  };

  const handleSettingsSave = (settings: any) => {
    onUpdate({
      ...project,
      settings: { ...project.settings, ...settings }
    });
    setShowSettings(false);
  };

  const getStatusIcon = (status: AgentRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResponseTypeColor = (type: AgentRun['type']) => {
    switch (type) {
      case 'pr':
        return 'bg-green-100 text-green-800';
      case 'plan':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeAgentRuns = project.agentRuns.filter(run => 
    run.status === 'pending' || run.status === 'running'
  );
  
  const recentAgentRun = project.agentRuns[0];
  const unreadNotifications = project.notifications.filter(n => !n.read);
  const hasCustomRules = project.settings.repositoryRules.trim().length > 0;

  return (
    <>
      <div className={clsx(
        "bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200",
        hasCustomRules ? "border-blue-200" : "border-gray-200"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <img
                  src={project.repository.owner.avatar_url}
                  alt={project.repository.owner.login}
                  className="w-10 h-10 rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {project.repository.name}
                  </h3>
                  {project.repository.private && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Private
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {project.repository.description || 'No description'}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {/* Notifications */}
              {unreadNotifications.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                </div>
              )}
              
              {/* Webhook Status */}
              <div className="flex items-center gap-1">
                <Webhook className={clsx(
                  "w-4 h-4",
                  project.webhookActive ? "text-green-500" : "text-gray-400"
                )} />
              </div>
              
              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Project Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {/* Delete */}
              <button
                onClick={() => onDelete(project.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Auto-merge checkbox */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id={`auto-merge-${project.id}`}
              checked={project.settings.autoMergeValidatedPR}
              onChange={(e) => handleSettingsSave({ autoMergeValidatedPR: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label 
              htmlFor={`auto-merge-${project.id}`}
              className="text-sm text-gray-700 cursor-pointer"
            >
              Auto-merge validated PR
            </label>
          </div>

          {/* Recent Agent Run */}
          {recentAgentRun && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(recentAgentRun.status)}
                  <span className="text-sm font-medium text-gray-900">
                    Latest Run
                  </span>
                  <span className={clsx(
                    "px-2 py-0.5 text-xs rounded-full",
                    getResponseTypeColor(recentAgentRun.type)
                  )}>
                    {recentAgentRun.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(recentAgentRun.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {recentAgentRun.target}
              </p>
              
              {recentAgentRun.response && (
                <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                  <p className="line-clamp-3">{recentAgentRun.response}</p>
                </div>
              )}

              {/* Action buttons based on response type */}
              {recentAgentRun.status === 'completed' && (
                <div className="flex gap-2 mt-3">
                  {recentAgentRun.type === 'regular' && (
                    <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                      Continue
                    </button>
                  )}
                  {recentAgentRun.type === 'plan' && (
                    <>
                      <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                        Confirm
                      </button>
                      <button className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors">
                        Modify
                      </button>
                    </>
                  )}
                  {recentAgentRun.type === 'pr' && (
                    <button className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
                      <Github className="w-3 h-3" />
                      View PR
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Runs Indicator */}
          {activeAgentRuns.length > 0 && (
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-sm text-blue-700">
                  {activeAgentRuns.length} active run{activeAgentRuns.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Agent Run Button */}
          <button
            onClick={() => setShowAgentDialog(true)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4" />
            Agent Run
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>{project.repository.language || 'Unknown'}</span>
              <span>★ {project.repository.stargazers_count}</span>
            </div>
            <a
              href={project.repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
            >
              <Github className="w-3 h-3" />
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AgentRunDialog
        isOpen={showAgentDialog}
        onClose={() => setShowAgentDialog(false)}
        onSubmit={handleAgentRun}
        isLoading={isLoading}
      />

      <ProjectSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        project={project}
        onSave={handleSettingsSave}
      />
    </>
  );
};
