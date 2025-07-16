import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Settings } from 'lucide-react';
import ListAgentRuns from './list-agent-runs';
import { SetupGuide } from './components/SetupGuide';
import { ProjectDashboard } from './components/ProjectDashboard';
import { IntegrationDashboard } from './components/IntegrationDashboard';
import { AgentRunSelectionProvider } from './contexts/AgentRunSelectionContext';
import { DialogProvider } from './contexts/DialogContext';
import { SettingsDialog } from './components/SettingsDialog';
import { ProjectDropdown } from './components/ProjectDropdown';
import { validateEnvironmentConfiguration } from './utils/preferences';
import { CachedProject } from './api/types';
import { getCachedProjects } from './storage/projectCache';
import './App.css';

// Header component with project dropdown and settings gear icon
interface HeaderProps {
  selectedProject: CachedProject | null;
  onProjectChange: (project: CachedProject | null) => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

function Header({ selectedProject, onProjectChange, currentView, onViewChange }: HeaderProps) {
  const [showSettings, setShowSettings] = React.useState(false);
  
  return (
    <>
      <header className="bg-black border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-white">
                {selectedProject && currentView === 'dashboard' ? `📁 ${selectedProject.name}` : '🤖 Codegen Agent Manager'}
              </h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => onViewChange('dashboard')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onViewChange('integration')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'integration'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Integration
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              {currentView === 'dashboard' && (
                <ProjectDropdown onProjectChange={onProjectChange} />
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center p-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <SettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}

// ... existing code ...

// Main dashboard component
interface DashboardProps {
  selectedProject: CachedProject | null;
}

function Dashboard({ selectedProject }: DashboardProps) {
  const [hasProjects, setHasProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const envValidation = validateEnvironmentConfiguration();
  
  // Check if user has any projects
  useEffect(() => {
    const checkProjects = async () => {
      try {
        const projects = await getCachedProjects();
        setHasProjects(projects.length > 0);
      } catch (error) {
        console.error('Failed to check projects:', error);
        setHasProjects(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkProjects();
  }, []);
  
  // Show setup guide if configuration is invalid
  if (!envValidation.isValid) {
    return <SetupGuide />;
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show project dashboard if user has projects, otherwise show agent runs list
  if (hasProjects) {
    return (
      <ProjectDashboard 
        selectedProject={selectedProject} 
        onProjectSelect={(project) => {
          // This will be handled by the parent component
          window.location.reload(); // Simple way to refresh the app state
        }} 
      />
    );
  }
  
  return <ListAgentRuns />;
}

function App() {
  const [selectedProject, setSelectedProject] = useState<CachedProject | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  return (
    <DialogProvider>
      <AgentRunSelectionProvider>
        <div className="min-h-screen bg-black">
          <Header 
            selectedProject={selectedProject} 
            onProjectChange={setSelectedProject}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
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
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === 'dashboard' ? (
              <Dashboard selectedProject={selectedProject} />
            ) : (
              <IntegrationDashboard />
            )}
          </main>
        </div>
      </AgentRunSelectionProvider>
    </DialogProvider>
  );
}

export default App;
