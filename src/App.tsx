import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Settings } from 'lucide-react';
import ListAgentRuns from './list-agent-runs';
import { SetupGuide } from './components/SetupGuide';
import { AgentRunSelectionProvider } from './contexts/AgentRunSelectionContext';
import { DialogProvider } from './contexts/DialogContext';
import { SettingsDialog } from './components/SettingsDialog';
import { ProjectDropdown } from './components/ProjectDropdown';
import { validateEnvironmentConfiguration } from './utils/preferences';
import { CachedProject } from './api/types';
import './App.css';

// Header component with project dropdown and settings gear icon
interface HeaderProps {
  selectedProject: CachedProject | null;
  onProjectChange: (project: CachedProject | null) => void;
}

function Header({ selectedProject, onProjectChange }: HeaderProps) {
  const [showSettings, setShowSettings] = React.useState(false);
  
  return (
    <>
      <header className="bg-black border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">
                {selectedProject ? `📁 ${selectedProject.name}` : '🤖 Agent Runs Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <ProjectDropdown onProjectChange={onProjectChange} />
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
  const envValidation = validateEnvironmentConfiguration();
  
  // Show setup guide if configuration is invalid
  if (!envValidation.isValid) {
    return <SetupGuide />;
  }
  
  return <ListAgentRuns selectedProject={selectedProject} />;
}

function App() {
  const [selectedProject, setSelectedProject] = useState<CachedProject | null>(null);

  return (
    <DialogProvider>
      <AgentRunSelectionProvider>
        <div className="min-h-screen bg-black">
          <Header 
            selectedProject={selectedProject} 
            onProjectChange={setSelectedProject} 
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
          
          <Dashboard selectedProject={selectedProject} />
        </div>
      </AgentRunSelectionProvider>
    </DialogProvider>
  );
}

export default App;
