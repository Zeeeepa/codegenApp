/// <reference types="jest" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ProjectProvider>
      {children}
    </ProjectProvider>
  </BrowserRouter>
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
