import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ListAgentRuns from './list-agent-runs';
import { SetupGuide } from './components/SetupGuide';
import { AgentRunSelectionProvider } from './contexts/AgentRunSelectionContext';
import { DialogProvider, useDialog } from './contexts/DialogContext';
import { CreateAgentRunDialog } from './components/CreateAgentRunDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { validateEnvironmentConfiguration } from './utils/preferences';
import './App.css';

// Simple header component
function Header() {
  return (
    <header className="bg-black border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">🤖 Agent Run Manager</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

// Dialogs component to render all dialogs
function Dialogs() {
  const { isDialogOpen, closeDialog } = useDialog();
  
  return (
    <>
      <CreateAgentRunDialog
        isOpen={isDialogOpen('create-run')}
        onClose={() => closeDialog()}
        onRunCreated={() => {
          // Refresh will be handled by the main component
          closeDialog();
        }}
      />
      <SettingsDialog
        isOpen={isDialogOpen('settings')}
        onClose={() => closeDialog()}
      />
    </>
  );
}

// Wrapper component that shows setup guide when needed
function AppContent() {
  const envValidation = validateEnvironmentConfiguration();
  
  // Show setup guide if configuration is invalid
  if (!envValidation.isValid) {
    return <SetupGuide />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/agent-runs" replace />} />
      <Route path="/agent-runs" element={<ListAgentRuns />} />
      {/* Redirect old routes to main page */}
      <Route path="/create-agent-run" element={<Navigate to="/agent-runs" replace />} />
      <Route path="/organizations" element={<Navigate to="/agent-runs" replace />} />
      <Route path="/settings" element={<Navigate to="/agent-runs" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
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
            
            <AppContent />
            <Dialogs />
          </div>
        </AgentRunSelectionProvider>
      </DialogProvider>
    </Router>
  );
}

export default App;
