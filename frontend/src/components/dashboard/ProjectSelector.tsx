import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Plus, Github, Star, GitFork } from 'lucide-react';
import { useGitHub } from '../../hooks';
import { ProjectSelectorProps } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onProjectSelect,
  selectedProjects
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { repositories, isLoading, error, fetchRepositories } = useGitHub();

  const loadRepositories = useCallback(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen, loadRepositories]);

  console.log('Number of repositories:', repositories.length);

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    repo.owner.login.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRepositorySelect = (repository: any) => {
    onProjectSelect(repository);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <Plus className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Add Project</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Repository List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading repositories...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <p className="text-sm">{error}</p>
                <button
                  onClick={loadRepositories}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : filteredRepositories.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <Github className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {searchTerm ? 'No repositories found' : 'No repositories available'}
                </p>
              </div>
            ) : (
              <>
                {filteredRepositories.map((repo) => {
                  const isSelected = selectedProjects.includes(repo.full_name);
                  
                  return (
                    <button
                      key={repo.id}
                      onClick={() => !isSelected && handleRepositorySelect(repo)}
                      disabled={isSelected}
                      className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                        isSelected 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Repository Name */}
                          <div className="flex items-center gap-2 mb-1">
                            <Github className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {repo.name}
                            </span>
                            {repo.private && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Private
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Added
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {repo.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {repo.description}
                            </p>
                          )}

                          {/* Repository Stats */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {repo.language && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>{repo.language}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span>{repo.stargazers_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              <span>{repo.forks_count}</span>
                            </div>
                            <span>
                              Updated {repo.updated_at ? formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true }) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {isLoading && (
                  <div className="p-4 text-center text-gray-500">
                    Loading...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={loadRepositories}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
