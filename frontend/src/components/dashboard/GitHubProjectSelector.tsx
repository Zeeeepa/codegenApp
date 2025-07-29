/**
 * GitHub Project Selector - Dropdown component for selecting GitHub repositories
 * Integrates with GitHub API to fetch and display available repositories
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Star, GitBranch, Calendar, ExternalLink, Plus } from 'lucide-react';
import GitHubService, { GitHubRepository } from '../../../services/githubService';
import { Project } from '../../types/dataModels';

interface GitHubProjectSelectorProps {
  onProjectSelect: (repository: GitHubRepository) => void;
  onProjectPin: (project: Project) => void;
  selectedProjects: Project[];
  className?: string;
}

interface RepositoryWithStatus extends GitHubRepository {
  isPinned: boolean;
  lastActivity?: string;
}

const GitHubProjectSelector: React.FC<GitHubProjectSelectorProps> = ({
  onProjectSelect,
  onProjectPin,
  selectedProjects,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [repositories, setRepositories] = useState<RepositoryWithStatus[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<RepositoryWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'stars'>('updated');
  const [filterBy, setFilterBy] = useState<'all' | 'pinned' | 'unpinned'>('all');

  const githubService = new GitHubService();

  // Load repositories
  const loadRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const repos = await githubService.getRepositories({
        sort: sortBy === 'updated' ? 'updated' : sortBy === 'name' ? 'full_name' : 'updated',
        per_page: 100,
      });

      const reposWithStatus: RepositoryWithStatus[] = repos.map(repo => ({
        ...repo,
        isPinned: selectedProjects.some(p => p.fullName === repo.full_name),
        lastActivity: repo.updated_at,
      }));

      setRepositories(reposWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [selectedProjects, sortBy]);

  // Filter and search repositories
  useEffect(() => {
    let filtered = repositories;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.topics.some(topic => topic.toLowerCase().includes(query))
      );
    }

    // Apply pinned filter
    if (filterBy === 'pinned') {
      filtered = filtered.filter(repo => repo.isPinned);
    } else if (filterBy === 'unpinned') {
      filtered = filtered.filter(repo => !repo.isPinned);
    }

    // Sort repositories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return (b as any).stargazers_count - (a as any).stargazers_count;
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    setFilteredRepositories(filtered);
  }, [repositories, searchQuery, sortBy, filterBy]);

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  const handleRepositorySelect = (repository: GitHubRepository) => {
    onProjectSelect(repository);
    setIsOpen(false);
  };

  const handleRepositoryPin = (repository: GitHubRepository, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const project: Project = {
      id: repository.id.toString(),
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description || undefined,
      url: repository.html_url,
      defaultBranch: repository.default_branch,
      language: repository.language || undefined,
      topics: repository.topics || [],
      private: repository.private,
      createdAt: new Date().toISOString(),
      updatedAt: repository.updated_at,
      pinned: true,
      pinnedAt: new Date().toISOString(),
      webhookConfigured: false,
      settings: {
        setupCommands: [],
        selectedBranch: repository.default_branch,
        secrets: {},
        autoConfirmPlan: false,
        autoMergeValidatedPR: false,
        validationEnabled: true,
        validationTimeout: 30,
        notifications: {
          prCreated: true,
          prUpdated: true,
          validationComplete: true,
          validationFailed: true,
        },
      },
      status: 'active',
      lastActivity: repository.updated_at,
    };

    onProjectPin(project);
    
    // Update local state
    setRepositories(prev => prev.map(repo => 
      repo.id === repository.id ? { ...repo, isPinned: true } : repo
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={loading}
      >
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">
            {loading ? 'Loading repositories...' : 'Select GitHub Repository'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search and Filters */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="updated">Recently Updated</option>
                <option value="name">Name</option>
                <option value="stars">Stars</option>
              </select>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Repos</option>
                <option value="pinned">Pinned</option>
                <option value="unpinned">Not Pinned</option>
              </select>
            </div>
          </div>

          {/* Repository List */}
          <div className="max-h-64 overflow-y-auto">
            {error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={loadRepositories}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Try Again
                </button>
              </div>
            ) : loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading repositories...</p>
              </div>
            ) : filteredRepositories.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-600">
                  {searchQuery ? 'No repositories match your search.' : 'No repositories found.'}
                </p>
              </div>
            ) : (
              filteredRepositories.map((repository) => (
                <div
                  key={repository.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleRepositorySelect(repository)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {repository.name}
                      </h4>
                      {repository.private && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Private
                        </span>
                      )}
                      {repository.isPinned && (
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {repository.full_name}
                    </p>
                    
                    {repository.description && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {repository.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2">
                      {repository.language && (
                        <span className="text-xs text-gray-500">
                          {repository.language}
                        </span>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(repository.updated_at)}
                        </span>
                      </div>
                    </div>
                    
                    {repository.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {repository.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {topic}
                          </span>
                        ))}
                        {repository.topics.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{repository.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={(e) => handleRepositoryPin(repository, e)}
                      className={`p-1 rounded-full hover:bg-gray-200 ${
                        repository.isPinned ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                      title={repository.isPinned ? 'Unpin repository' : 'Pin repository'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    <a
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                      title="Open in GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600 text-center">
              {filteredRepositories.length} of {repositories.length} repositories
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubProjectSelector;

