/// <reference types="jest" />
import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { ProjectProvider } from './contexts/ProjectContext';

// Mock the preferences module to avoid environment variable issues in tests
jest.mock('./utils/preferences', () => ({
  validateEnvironmentConfiguration: () => ({
    isValid: true,
    missingVars: [],
    warnings: []
  }),
  getApiToken: () => 'test-token',
  getOrganizationId: () => 'test-org',
  setApiToken: jest.fn(),
  setOrganizationId: jest.fn(),
  getEnvFileContent: () => Promise.resolve(''),
  saveEnvFileContent: jest.fn()
}));

// Mock react-hot-toast to avoid issues in test environment
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  },
  Toaster: () => null
}));

// Mock WebSocket hook to avoid connection issues in tests
jest.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    readyState: 1
  })
}));

// Mock storage functions
jest.mock('./storage/projectCache', () => ({
  getCachedProjects: () => Promise.resolve([])
}));

// Test wrapper component with all required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProjectProvider>
    {children}
  </ProjectProvider>
);

describe('App Component', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('renders main content area', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    
    // Should render the main app structure
    const mainContent = document.querySelector('.min-h-screen');
    expect(mainContent).toBeInTheDocument();
  });
});
