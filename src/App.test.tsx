import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

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

describe('App Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  test('renders main content area', () => {
    render(<App />);
    
    // Should render the main app structure
    const mainContent = document.querySelector('.min-h-screen');
    expect(mainContent).toBeInTheDocument();
  });
});
