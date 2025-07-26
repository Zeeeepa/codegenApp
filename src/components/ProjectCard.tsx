/**
 * Project card component for the dashboard.
 * 
 * Displays project information, agent run controls, and real-time
 * progress updates for the CI/CD workflow system.
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  GitBranch, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Settings
} from 'lucide-react';
import { useProject, AgentRun, ValidationPipeline } from '../contexts/ProjectContext';
import { CachedProject } from '../api/types';
import { getProjectSettings, ProjectSettings } from '../storage/projectSettings';

interface ProjectCardProps {
  project: CachedProject;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdate?: (project: CachedProject) => void;
  className?: string;
}

export function ProjectCard({ project, isSelected, onSelect, onUpdate, className = '' }: ProjectCardProps) {
  const { state, startAgentRun, continueAgentRun, handlePlanResponse } = useProject();
  const [targetText, setTargetText] = useState('');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);
  const [continuationText, setContinuationText] = useState('');
  const [planModificationText, setPlanModificationText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load project settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getProjectSettings(project.id);
        setProjectSettings(settings);
      } catch (error) {
        console.error('Failed to load project settings:', error);
      }
    };
    loadSettings();
  }, [project.id]);

  // Get active runs and validations for this project
  const activeRuns = state.activeRuns.filter(run => run.project_id === project.id);
  const activeValidations = state.activeValidations.filter(val => val.project_id === project.id);
  const currentRun = activeRuns[0]; // Most recent run

  const handleStartRun = async () => {
    if (!targetText.trim()) return;

    setIsRunning(true);
    try {
      await startAgentRun(project.id, targetText);
      setTargetText('');
    } catch (error) {
      console.error('Failed to start agent run:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleContinueRun = async (runId: string) => {
    if (!continuationText.trim()) return;

    try {
      await continueAgentRun(runId, continuationText);
      setContinuationText('');
    } catch (error) {
      console.error('Failed to continue agent run:', error);
    }
  };

  const handlePlanConfirm = async (runId: string) => {
    try {
      await handlePlanResponse(runId, 'confirm');
    } catch (error) {
      console.error('Failed to confirm plan:', error);
    }
  };

  const handlePlanModify = async (runId: string) => {
    if (!planModificationText.trim()) return;

    try {
      await handlePlanResponse(runId, 'modify', planModificationText);
      setPlanModificationText('');
    } catch (error) {
      console.error('Failed to modify plan:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'waiting_input':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'waiting_input':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{project.description || 'No description available'}</p>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <GitBranch className="w-4 h-4" />
                <span>{project.fullName}</span>
              </div>
              <div className="text-sm text-gray-500">
                Updated: {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && projectSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Auto-confirm Plan:</span>
              <span className={`ml-2 ${projectSettings.autoConfirmPlan ? 'text-green-600' : 'text-red-600'}`}>
                {projectSettings.autoConfirmPlan ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Selected Branch:</span>
              <span className="ml-2 text-gray-600">{projectSettings.selectedBranch || 'main'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-600">{new Date(projectSettings.lastUpdated).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Repository Rules:</span>
              <span className="ml-2 text-gray-600">{projectSettings.repositoryRules ? 'Configured' : 'None'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Agent Run Section */}
      <div className="p-6">
        {/* Current Run Status */}
        {currentRun && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(currentRun.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentRun.status)}`}>
                  {currentRun.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {currentRun.progress_percentage}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentRun.progress_percentage}%` }}
              />
            </div>

            {/* Current Step */}
            {currentRun.current_step && (
              <div className="text-sm text-gray-600 mb-3">
                Current step: {currentRun.current_step}
              </div>
            )}

            {/* Target Text */}
            <div className="text-sm text-gray-700 mb-3">
              <span className="font-medium">Target:</span> {currentRun.target_text}
            </div>

            {/* Response Actions */}
            {currentRun.status === 'waiting_input' && currentRun.response_type === 'regular' && (
              <div className="space-y-3">
                <textarea
                  value={continuationText}
                  onChange={(e) => setContinuationText(e.target.value)}
                  placeholder="Enter continuation text..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                <button
                  onClick={() => handleContinueRun(currentRun.id)}
                  disabled={!continuationText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Plan Response Actions */}
            {currentRun.status === 'waiting_input' && currentRun.response_type === 'plan' && (
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => handlePlanConfirm(currentRun.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirm Plan
                  </button>
                  <button
                    onClick={() => document.getElementById('plan-modify')?.focus()}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  >
                    Modify Plan
                  </button>
                </div>
                <textarea
                  id="plan-modify"
                  value={planModificationText}
                  onChange={(e) => setPlanModificationText(e.target.value)}
                  placeholder="Enter plan modifications..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                {planModificationText.trim() && (
                  <button
                    onClick={() => handlePlanModify(currentRun.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Submit Modifications
                  </button>
                )}
              </div>
            )}

            {/* PR Created */}
            {currentRun.response_type === 'pr' && currentRun.response_data?.pr_url && (
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">PR created:</span>
                <a
                  href={currentRun.response_data.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <span>View PR</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Error Message */}
            {currentRun.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-700 text-sm">
                  <span className="font-medium">Error:</span> {currentRun.error_message}
                </div>
                {currentRun.retry_count < 3 && (
                  <button className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium flex items-center space-x-1">
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Start New Run */}
        {!currentRun || ['completed', 'failed', 'cancelled'].includes(currentRun.status) ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="target-text" className="block text-sm font-medium text-gray-700 mb-2">
                Target / Goal
              </label>
              <textarea
                id="target-text"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder="Describe what you want to achieve..."
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>
            <button
              onClick={handleStartRun}
              disabled={!targetText.trim() || isRunning}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run</span>
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* Active Validations */}
        {activeValidations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Active Validations</h4>
            {activeValidations.map((validation) => (
              <div key={validation.id} className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      PR #{validation.pull_request_id}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {validation.progress_percentage}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${validation.progress_percentage}%` }}
                  />
                </div>
                {validation.current_step && (
                  <div className="text-xs text-gray-600">
                    {validation.current_step}
                  </div>
                )}
                {validation.deployment_url && (
                  <a
                    href={validation.deployment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1 mt-1"
                  >
                    <span>View Deployment</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
