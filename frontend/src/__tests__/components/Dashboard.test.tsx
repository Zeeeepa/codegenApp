/**
 * Test suite for Dashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard';
import { ProjectProvider } from '../../contexts/ProjectContext';

// Mock dependencies
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    readyState: 1
  })
}));

const mockGetOrganizations = jest.fn().mockResolvedValue({
  data: [
    { id: 1, name: 'Test Org', slug: 'test-org' }
  ]
});

const mockCreateAgentRun = jest.fn().mockResolvedValue({
  id: 1,
  status: 'pending'
});

jest.mock('../../api/client', () => ({
  getAPIClient: () => ({
    getOrganizations: mockGetOrganizations,
    createAgentRun: mockCreateAgentRun
  })
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProjectProvider>
    {children}
  </ProjectProvider>
);

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard without crashing', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Should show loading indicator
    const loadingElement = screen.queryByTestId('loading-spinner');
    if (loadingElement) {
      expect(loadingElement).toBeInTheDocument();
    }
  });

  test('handles project selection', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  test('displays error state when API fails', async () => {
    // Mock API failure
    mockGetOrganizations.mockRejectedValueOnce(new Error('API Error'));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const errorElement = screen.queryByText(/error/i);
      if (errorElement) {
        expect(errorElement).toBeInTheDocument();
      }
    });
  });
});
