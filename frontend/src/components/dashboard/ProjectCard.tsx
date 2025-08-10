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
  Trash2,
  FileCode,
  TestTube2,
  Rocket,
} from 'lucide-react';
import { ProjectCardProps, AgentRun } from '../../types';
import { AgentRunDialog } from '../agent/AgentRunDialog';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { ValidationFlowDialog } from './ValidationFlowDialog';
import { useAgentRun } from '../../hooks';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { getPreferenceValues, setPreferenceValues } from '../../utils/preferences';

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onUpdate,
  onDelete
}) => {
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showValidationFlow, setShowValidationFlow] = useState(false);
  const [selectedPR, setSelectedPR] = useState<number | null>(null);
  const { createAgentRun, isLoading } = useAgentRun();

  const [automationSettings, setAutomationSettings] = useState({
    enableAutoPR: getPreferenceValues().enableAutoPR || false,
    enableAutoTest: getPreferenceValues().enableAutoTest || false,
    enableAutoDeploy: getPreferenceValues().enableAutoDeploy || false,
  });

  const handleToggleAutomation = async (setting: keyof typeof automationSettings) => {
    const newSettings = { ...automationSettings, [setting]: !automationSettings[setting] };
    setAutomationSettings(newSettings);
    try {
      await setPreferenceValues(newSettings);
    } catch (error) {
      console.error('Failed to save automation settings:', error);
    }
  };

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

  const handleValidationComplete = (success: boolean) => {
    setShowValidationFlow(false);
    setSelectedPR(null);
    if (success) {
      console.log('Validation completed successfully');
    }
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
        return 'bg-green-800 text-green-100';
      case 'plan':
        return 'bg-blue-800 text-blue-100';
      default:
        return 'bg-gray-800 text-gray-100';
    }
  };

  const recentAgentRun = project.agentRuns[0];
  const unreadNotifications = project.notifications.filter(n => !n.read);
  const hasCustomRules = project.settings?.repositoryRules?.trim().length > 0;
  const hasSetupCommands = project.settings?.setupCommands?.trim().length > 0;
  const hasSecrets = project.settings?.secrets && Object.keys(project.settings.secrets).length > 0;
  
  return (
    <>
      <div className={clsx(
        "bg-gray-900 rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200",
        hasCustomRules ? "border-blue-700" : "border-gray-700",
        hasSetupCommands && "border-l-4 border-l-green-500",
        hasSecrets && "border-r-4 border-r-purple-500"
      )}>
        <div className="p-4 border-b border-gray-800">
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
                  <h3 className="font-semibold text-white truncate">
                    {project.repository.name}
                  </h3>
                  {project.repository.private && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-800 text-yellow-100 rounded-full">
                      Private
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 truncate">
                  {project.repository.description || 'No description'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button onClick={() => handleToggleAutomation('enableAutoPR')} title="Toggle Auto PR">
                <FileCode className={clsx("w-4 h-4", automationSettings.enableAutoPR ? "text-blue-500" : "text-gray-400")} />
              </button>
              <button onClick={() => handleToggleAutomation('enableAutoTest')} title="Toggle Auto Test">
                <TestTube2 className={clsx("w-4 h-4", automationSettings.enableAutoTest ? "text-green-500" : "text-gray-400")} />
              </button>
              <button onClick={() => handleToggleAutomation('enableAutoDeploy')} title="Toggle Auto Deploy">
                <Rocket className={clsx("w-4 h-4", automationSettings.enableAutoDeploy ? "text-purple-500" : "text-gray-400")} />
              </button>

              {unreadNotifications.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                </div>
              )}
              
              <Webhook className={clsx("w-4 h-4", project.webhookActive ? "text-green-500" : "text-gray-400")} />
              
              <button onClick={() => setShowSettings(true)} className="p-1 text-gray-400 hover:text-white" title="Project Settings">
                <Settings className="w-4 h-4" />
              </button>
              
              <button onClick={() => onDelete(project.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remove Project">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`auto-confirm-${project.id}`}
                checked={project.settings?.autoConfirmPlan || false}
                onChange={(e) => handleSettingsSave({ autoConfirmPlan: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor={`auto-confirm-${project.id}`} className="text-sm text-gray-300">Auto Confirm Proposed Plan</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`auto-merge-${project.id}`}
                checked={project.settings?.autoMergeValidatedPR || false}
                onChange={(e) => handleSettingsSave({ autoMergeValidatedPR: e.target.checked })}
                className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
              />
              <label htmlFor={`auto-merge-${project.id}`} className="text-sm text-gray-300">Auto-merge validated PR</label>
            </div>
          </div>

          {recentAgentRun && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(recentAgentRun.status)}
                  <span className="text-sm font-medium text-white">Latest Run</span>
                  <span className={clsx("px-2 py-0.5 text-xs rounded-full", getResponseTypeColor(recentAgentRun.type))}>
                    {recentAgentRun.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(recentAgentRun.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-2 line-clamp-2">{recentAgentRun.target}</p>
            </div>
          )}

          <button
            onClick={() => setShowAgentDialog(true)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Agent Run
          </button>
        </div>

        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{project.repository.language || 'Unknown'}</span>
            <span>★ {project.repository.stargazers_count}</span>
            <a href={project.repository.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white">
              <Github className="w-3 h-3" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      <AgentRunDialog
        isOpen={showAgentDialog}
        onClose={() => setShowAgentDialog(false)}
        onSubmit={handleAgentRun}
        isLoading={isLoading}
        project={project}
      />

      <ProjectSettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        project={project}
        onSave={handleSettingsSave}
      />

      <ValidationFlowDialog
        isOpen={showValidationFlow}
        onClose={() => setShowValidationFlow(false)}
        project={project}
        prNumber={selectedPR}
        onComplete={handleValidationComplete}
      />
    </>
  );
};