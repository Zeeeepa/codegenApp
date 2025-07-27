import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { CachedProject, ProjectFilters } from '../api/types';
import { getCachedProjects, filterProjects } from '../storage/projectCache';
import { ProjectCard } from './ProjectCard';
import { WebEvalPanel } from './WebEvalPanel';
import { getPreferenceValues } from '../utils/preferences';
import { getGitHubClient } from '../api/github';
import { updateProjectPRCount } from '../storage/projectCache';
import toast from 'react-hot-toast';

interface ProjectDashboardProps {
  selectedProject: CachedProject | null;
  onProjectSelect: (project: CachedProject) => void;
}

export function ProjectDashboard({ selectedProject, onProjectSelect }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<CachedProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CachedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'web-eval'>('projects');
  const [filters, setFilters] = useState<ProjectFilters>({
    sortBy: 'updated',
    sortDirection: 'desc',
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const cachedProjects = await getCachedProjects();
      setProjects(cachedProjects);
      
      // Load PR counts for all projects
      await loadPRCounts(cachedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    // Apply filters whenever projects or filters change
    const filtered = filterProjects(projects, {
      ...filters,
      searchQuery,
    });
    setFilteredProjects(filtered);
  }, [projects, filters, searchQuery]);

  const loadPRCounts = async (projectList: CachedProject[]) => {
    try {
      const preferences = await getPreferenceValues();
      if (!preferences.githubToken) {
        return;
      }

      const client = getGitHubClient(preferences.githubToken);
      
      // Load PR counts for all projects in parallel
      const prCountPromises = projectList.map(async (project) => {
        try {
          const [owner, repo] = project.id.split('/');
          if (!owner || !repo) return;
          
          const prs = await client.getPullRequestsAheadOfMain(owner, repo, project.defaultBranch);
          await updateProjectPRCount(project.id, prs.length);
          
          return { projectId: project.id, prCount: prs.length };
        } catch (error) {
          console.error(`Failed to load PR count for ${project.id}:`, error);
          return { projectId: project.id, prCount: 0 };
        }
      });

      const prCounts = await Promise.all(prCountPromises);
      
      // Update projects with PR counts
      const updatedProjects = projectList.map(project => {
        const prData = prCounts.find(pc => pc?.projectId === project.id);
        return {
          ...project,
          prCount: prData?.prCount || 0,
        };
      });
      
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to load PR counts:', error);
    }
  };

  const handleProjectUpdate = async () => {
    // Reload projects when a project is updated
    await loadProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-medium text-white mb-2">No Projects Yet</h3>
          <p className="text-gray-400 mb-4">
            Add your first GitHub repository to get started with project-based agent runs.
          </p>
          <p className="text-sm text-gray-500">
            Use the project dropdown in the header to add repositories from GitHub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            📁 Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('web-eval')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'web-eval'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <RefreshCw className="inline w-4 h-4 mr-1" />
            Web Evaluation
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Header with Search and Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-white">Projects</h2>
              <span className="text-sm text-gray-400">
                {filteredProjects.length} of {projects.length} projects
              </span>
            </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
          </div>
          
          {/* Sort Dropdown */}
          <select
            value={`${filters.sortBy}-${filters.sortDirection}`}
            onChange={(e) => {
              const [sortBy, sortDirection] = e.target.value.split('-') as [any, 'asc' | 'desc'];
              setFilters({ ...filters, sortBy, sortDirection });
            }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="updated-desc">Recently Updated</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="created-desc">Recently Created</option>
            <option value="stars-desc">Most Stars</option>
            <option value="prCount-desc">Most PRs</option>
          </select>
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-gray-400">
            {searchQuery ? 'Try adjusting your search terms.' : 'No projects match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedProject?.id === project.id}
              onSelect={() => onProjectSelect(project)}
              onUpdate={handleProjectUpdate}
            />
          ))}
        </div>
      )}
        </div>
      )}

      {/* Web Evaluation Tab */}
      {activeTab === 'web-eval' && (
        <div className="max-w-4xl mx-auto">
          <WebEvalPanel />
        </div>
      )}
    </div>
  );
}
