import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Github, Settings } from 'lucide-react';
import { ProjectSelector } from './components/dashboard/ProjectSelector';
import { ProjectCard } from './components/dashboard/ProjectCard';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipNavigation } from './components/SkipNavigation';
import { useProjectStore } from './store/projectStore';
import { githubService } from './services/github';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const {
    projects,
    isLoading,
    error,
    addProject,
    removeProject,
    updateProject,
    setLoading,
    setError,
    clearError
  } = useProjectStore();

  // Validate GitHub token on app start
  useEffect(() => {
    // const validateGitHubToken = async () => {
    //   setLoading(true);
    //   try {
    //     const isValid = await githubService.validateToken();
    //     if (!isValid) {
    //       setError('Invalid GitHub token. Please check your configuration.');
    //     }
    //   } catch (err: any) {
    //     setError('Failed to validate GitHub token: ' + err.message);
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    // validateGitHubToken();
  }, [setLoading, setError]);

  const handleProjectSelect = async (repository: any) => {
    try {
      setLoading(true);
      clearError();
      
      // Add project to store
      addProject(repository);
      
      // Set up webhook
      const webhookUrl = process.env.REACT_APP_CLOUDFLARE_WORKER_URL;
      if (webhookUrl) {
        const success = await githubService.setupWebhook(
          repository.owner.login,
          repository.name,
          webhookUrl
        );
        
        if (success) {
          // Update project with webhook status
          const projectId = projects.find(p => p.repository.id === repository.id)?.id;
          if (projectId) {
            updateProject(projectId, { 
              webhookActive: true,
              webhookUrl: webhookUrl
            });
          }
        }
      }
    } catch (err: any) {
      setError('Failed to add project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProjectNames = projects.map(p => p.repository.full_name);

  return (
    <ErrorBoundary>
      <SkipNavigation />
      <div className="min-h-screen text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 shadow-sm" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <h1 className="text-xl font-bold text-white">
                    CodegenApp Dashboard
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div id="project-selector">
                  <ProjectSelector
                    onProjectSelect={handleProjectSelect}
                    selectedProjects={selectedProjectNames}
                  />
                </div>
                
                <button 
                  id="settings-button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
                  data-testid="settings-button"
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          id="main-content" 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          role="main"
          aria-label="Dashboard content"
        >
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-gray-400">Loading...</span>
          </div>
        )}

        {/* Project Cards Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUpdate={(updatedProject) => updateProject(updatedProject.id, updatedProject)}
                onDelete={removeProject}
              />
            ))}
          </div>
        ) : !isLoading && (
          <div className="text-center py-12">
            <Github className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No projects added yet
            </h3>
            <p className="text-gray-400 mb-6">
              Add your first GitHub repository to get started with automated code generation.
            </p>
            <div className="flex justify-center">
              <ProjectSelector
                onProjectSelect={handleProjectSelect}
                selectedProjects={selectedProjectNames}
              />
            </div>
          </div>
        )}
        </main>

        {/* Settings Dialog */}
        <SettingsDialog 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
