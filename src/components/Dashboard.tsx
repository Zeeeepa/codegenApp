/**
 * Main dashboard component for the CI/CD flow management system.
 * 
 * Provides the primary interface for project management, agent runs,
 * and validation pipeline monitoring with real-time updates.
 */

import React, { useEffect } from 'react';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { ProjectDropdown } from './ProjectDropdown';
import { ProjectCard } from './ProjectCard';
import { Activity, GitBranch, Clock, CheckCircle, XCircle } from 'lucide-react';

function DashboardContent() {
  const { state, loadProjects } = useProject();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalActiveRuns = state.activeRuns.length;
  const totalActiveValidations = state.activeValidations.length;
  const runningRuns = state.activeRuns.filter(run => run.status === 'running').length;
  const completedRuns = state.activeRuns.filter(run => run.status === 'completed').length;
  const failedRuns = state.activeRuns.filter(run => run.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">CodegenApp CI/CD</h1>
              </div>
            </div>
            
            {/* Real-time Stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Active Runs:</span>
                <span className="font-medium text-gray-900">{totalActiveRuns}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <GitBranch className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">Validations:</span>
                <span className="font-medium text-gray-900">{totalActiveValidations}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Project Selection</h2>
            <div className="text-sm text-gray-500">
              {state.projects.length} project{state.projects.length !== 1 ? 's' : ''} available
            </div>
          </div>
          <ProjectDropdown className="max-w-md" />
        </div>

        {/* Dashboard Stats */}
        {state.selectedProject && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Running</div>
                  <div className="text-2xl font-semibold text-gray-900">{runningRuns}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Completed</div>
                  <div className="text-2xl font-semibold text-gray-900">{completedRuns}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Failed</div>
                  <div className="text-2xl font-semibold text-gray-900">{failedRuns}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GitBranch className="w-8 h-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Validations</div>
                  <div className="text-2xl font-semibold text-gray-900">{totalActiveValidations}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Card */}
        {state.selectedProject ? (
          <div className="space-y-6">
            <ProjectCard project={state.selectedProject} />
            
            {/* Recent Activity */}
            {(state.activeRuns.length > 0 || state.activeValidations.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Recent Agent Runs */}
                    {state.activeRuns.slice(0, 5).map((run) => (
                      <div key={run.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {run.status === 'running' && <Clock className="w-5 h-5 text-blue-500 animate-spin" />}
                          {run.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {run.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            Agent Run: {run.target_text}
                          </div>
                          <div className="text-sm text-gray-500">
                            {run.status} • {new Date(run.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {run.progress_percentage}%
                        </div>
                      </div>
                    ))}

                    {/* Recent Validations */}
                    {state.activeValidations.slice(0, 3).map((validation) => (
                      <div key={validation.id} className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <GitBranch className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            Validation Pipeline: PR #{validation.pull_request_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {validation.status} • {validation.current_step || 'Starting...'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {validation.progress_percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-gray-500">
              Choose a project from the dropdown above to start managing your CI/CD workflows.
            </p>
          </div>
        )}

        {/* Loading State */}
        {state.loading && (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading projects...</p>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Projects</h3>
            <p className="text-gray-500 mb-4">{state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export function Dashboard() {
  return (
    <ProjectProvider>
      <DashboardContent />
    </ProjectProvider>
  );
}

