import React from 'react';
import { Toaster } from 'react-hot-toast';
import ListAgentRuns from './list-agent-runs';
import { SetupGuide } from './components/SetupGuide';
import { AgentRunSelectionProvider } from './contexts/AgentRunSelectionContext';
import { DialogProvider } from './contexts/DialogContext';
import { validateEnvironmentConfiguration } from './utils/preferences';
import './App.css';

// Simple header component
function Header() {
  return (
    <header className="bg-black border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Agent Run Manager</h1>
          </div>
        </div>
      </div>
    </header>
  );
}



function App() {
  const envValidation = validateEnvironmentConfiguration();
  
  // Show setup guide if configuration is invalid
  const showSetupGuide = !envValidation.isValid;
  
  return (
    <DialogProvider>
      <AgentRunSelectionProvider>
        <div className="min-h-screen bg-black">
          <Header />
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
          
          {showSetupGuide ? <SetupGuide /> : <ListAgentRuns />}
        </div>
      </AgentRunSelectionProvider>
    </DialogProvider>
  );
}

export default App;
