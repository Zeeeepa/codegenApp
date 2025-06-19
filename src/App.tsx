import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ListOrganizations from './list-organizations';
import CreateAgentRun from './create-agent-run';
import ListAgentRuns from './list-agent-runs';
import { SetupGuide } from './components/SetupGuide';
import { AgentRunSelectionProvider } from './contexts/AgentRunSelectionContext';
import { getPreferenceValues, setPreferenceValues, getEnvFileContent, validateEnvironmentConfiguration } from './utils/preferences';
import './App.css';

// Navigation component
function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/agent-runs', label: 'Agent Runs', icon: '🤖' },
    { path: '/create-agent-run', label: 'Create Run', icon: '➕' },
    { path: '/organizations', label: 'Organizations', icon: '🏢' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  
  return (
    <nav className="bg-black border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white">Raycast Extension</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-gray-800 border-blue-500 text-white'
                  : 'border-transparent text-gray-300 hover:bg-gray-700 hover:border-gray-300 hover:text-white'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Settings component with dark theme
function Settings() {
  const [orgId, setOrgId] = React.useState('');
  const [token, setToken] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [envContent, setEnvContent] = React.useState('');
  const [envValidation, setEnvValidation] = React.useState(validateEnvironmentConfiguration());

  const handleSave = async () => {
    try {
      // Save using the preference storage system
      await setPreferenceValues({
        apiToken: token,
        defaultOrganization: orgId,
      });
      
      // Get the updated .env content
      const content = await getEnvFileContent();
      setEnvContent(content);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  React.useEffect(() => {
    // Load existing values using the preference system
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferenceValues();
        setOrgId(preferences.defaultOrganization || '');
        setToken(preferences.apiToken || '');
        
        console.log('Loaded preferences:', {
          hasToken: !!preferences.apiToken,
          hasOrgId: !!preferences.defaultOrganization,
          apiBaseUrl: preferences.apiBaseUrl
        });
        
        // Always generate and show .env content based on current preferences
        const envLines: string[] = [];
        if (preferences.defaultOrganization) {
          envLines.push(`org_id=${preferences.defaultOrganization}`);
        } else {
          envLines.push('org_id=');
        }
        if (preferences.apiToken) {
          envLines.push(`token=${preferences.apiToken}`);
        } else {
          envLines.push('token=');
        }
        const generatedContent = envLines.join('\n') + '\n';
        setEnvContent(generatedContent);
        
        // Also try to load any previously saved .env content
        const savedContent = await getEnvFileContent();
        if (savedContent) {
          setEnvContent(savedContent);
        }
        
        // Update environment validation
        setEnvValidation(validateEnvironmentConfiguration());
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
        <div className="bg-black rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="space-y-6">
            <div>
              <label htmlFor="org_id" className="block text-sm font-medium text-gray-300 mb-2">
                Organization ID
              </label>
              <input
                type="text"
                id="org_id"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your organization ID"
              />
            </div>
            
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                API Token
              </label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your API token"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                Save Settings
              </button>
              
              {saved && (
                <span className="text-green-400 text-sm font-medium">
                  ✓ Settings saved successfully!
                </span>
              )}
            </div>
            
            {envContent && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">📄 .env File Content</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Please update your <code className="bg-gray-700 px-1 rounded">.env</code> file at{' '}
                  <code className="bg-gray-700 px-1 rounded">c:\Users\L\Desktop\raycast-extension-main\.env</code>{' '}
                  with the following content:
                </p>
                <div className="bg-gray-900 p-3 rounded border border-gray-600">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                    {envContent}
                  </pre>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(envContent)}
                    className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    📋 Copy to Clipboard
                  </button>
                  <span className="text-gray-400 text-xs">
                    After updating the .env file, refresh the page to load the new settings.
                  </span>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-2">Environment Variables Status</h3>
              <div className="space-y-3 text-sm">
                {envValidation.missingVars.length > 0 && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <div className="text-red-400 font-medium mb-1">❌ Missing Required Variables:</div>
                    <ul className="text-red-300 text-xs space-y-1">
                      {envValidation.missingVars.map(varName => (
                        <li key={varName}>• {varName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {envValidation.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <div className="text-yellow-400 font-medium mb-1">⚠️ Warnings:</div>
                    <ul className="text-yellow-300 text-xs space-y-1">
                      {envValidation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {envValidation.isValid && envValidation.warnings.length === 0 && (
                  <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="text-green-400 font-medium">✅ All environment variables are properly configured!</div>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-medium text-white mb-2 mt-6">Current Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">
                  <span className="font-medium">Org ID:</span> 
                  <span className="ml-2 text-gray-400">{orgId || 'Not set'}</span>
                </div>
                <div className="text-gray-300">
                  <span className="font-medium">Token:</span> 
                  <span className="ml-2 text-gray-400">{token ? `${token.substring(0, 8)}...` : 'Not set'}</span>
                </div>
                <div className="text-gray-300">
                  <span className="font-medium">API Base URL:</span> 
                  <span className="ml-2 text-gray-400">{process.env.REACT_APP_API_BASE_URL || 'Using default'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that shows setup guide when needed
function AppContent() {
  const envValidation = validateEnvironmentConfiguration();
  
  // Show setup guide if configuration is invalid and we're not on settings page
  const location = useLocation();
  const showSetupGuide = !envValidation.isValid && location.pathname !== '/settings';
  
  if (showSetupGuide) {
    return <SetupGuide />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/agent-runs" replace />} />
      <Route path="/organizations" element={<ListOrganizations />} />
      <Route path="/create-agent-run" element={<CreateAgentRun />} />
      <Route path="/agent-runs" element={<ListAgentRuns />} />
      <Route path="/settings" element={<Settings />} />
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
      <AgentRunSelectionProvider>
        <div className="min-h-screen bg-black">
          <Navigation />
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
        </div>
      </AgentRunSelectionProvider>
    </Router>
  );
}

export default App;
