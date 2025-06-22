/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock API client
jest.mock('../api/client', () => ({
  getAPIClient: () => ({
    getAgentRuns: jest.fn().mockResolvedValue({
      data: [
        {
          id: 123,
          status: 'stopped',
          prompt: 'Test prompt',
          created_at: '2024-01-01T00:00:00Z'
        }
      ],
      total: 1,
      page: 1,
      size: 10
    }),
    getAgentRun: jest.fn().mockResolvedValue({
      id: 123,
      status: 'stopped',
      prompt: 'Test prompt',
      created_at: '2024-01-01T00:00:00Z'
    })
  })
}));

// Mock preferences
jest.mock('../utils/preferences', () => ({
  validateEnvironmentConfiguration: () => ({
    isValid: true,
    missingVars: [],
    warnings: []
  }),
  getApiToken: () => 'test-token',
  getOrganizationId: () => 456
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

// Mock window.open and window.prompt
const mockWindowOpen = jest.fn();
const mockWindowPrompt = jest.fn();
const mockBrowserWindow = {
  document: {
    evaluate: jest.fn(),
    querySelector: jest.fn(),
  },
  close: jest.fn(),
  focus: jest.fn()
};

Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

Object.defineProperty(window, 'prompt', {
  writable: true,
  value: mockWindowPrompt
});

// Import the component after mocking
import ListAgentRuns from '../list-agent-runs';

describe('List Agent Runs Browser Automation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockReturnValue(mockBrowserWindow);
    mockWindowPrompt.mockReturnValue('Test response message');
  });

  describe('Respond to Agent Run Automation', () => {
    test('opens invisible browser window for respond functionality', async () => {
      render(<ListAgentRuns />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      // Find and click a respond button (this would be on a stopped/failed run)
      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);
      
      expect(mockWindowPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Enter your response to agent run'),
        'Please continue with the task'
      );
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://codegen.com/agent/trace/123',
        '_blank',
        'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no'
      );
    });

    test('handles empty prompt input gracefully', async () => {
      mockWindowPrompt.mockReturnValue(''); // Empty prompt
      
      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);
      
      // Should not open browser window for empty prompt
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    test('handles null prompt (user cancellation) gracefully', async () => {
      mockWindowPrompt.mockReturnValue(null); // User cancelled
      
      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);
      
      // Should not open browser window for cancelled prompt
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    test('uses XPath selectors for chat input automation', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: mockSendButton });

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.evaluate).toHaveBeenCalledWith(
          '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
          mockBrowserWindow.document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
      }, { timeout: 6000 });
    });

    test('falls back to CSS selectors when XPath fails', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock XPath to fail, CSS to succeed
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: null
      });
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(mockChatInput)
        .mockReturnValueOnce(mockSendButton);

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div'
        );
      }, { timeout: 6000 });
    });

    test('sets input value and triggers React events', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: mockSendButton });

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockChatInput.value).toBe('Test response message');
        expect(mockChatInput.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'input',
            bubbles: true
          })
        );
        expect(mockChatInput.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'change',
            bubbles: true
          })
        );
      }, { timeout: 6000 });
    });

    test('clicks send button after input processing', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: mockSendButton });

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockSendButton.click).toHaveBeenCalled();
      }, { timeout: 6000 });
    });

    test('closes browser window after successful automation', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: mockSendButton });

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockBrowserWindow.close).toHaveBeenCalled();
      }, { timeout: 6000 });
    });

    test('handles popup blocker by falling back to manual approach', async () => {
      mockWindowOpen.mockReturnValue(null); // Popup blocked
      
      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      // Should fall back to manual approach
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test response message');
      });
    });

    test('handles automation failure gracefully', async () => {
      // Mock selectors to fail
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: null
      });
      mockBrowserWindow.document.querySelector.mockReturnValue(null);

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      // Should handle failure and fall back
      await waitFor(() => {
        expect(mockBrowserWindow.close).toHaveBeenCalled();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test response message');
      }, { timeout: 6000 });
    });

    test('uses correct agent run ID in URL', async () => {
      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://codegen.com/agent/trace/123',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Send Button Selection Strategies', () => {
    test('tries multiple send button selectors in order', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock chat input found, send button requires fallback
      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: null }); // XPath send button fails
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(mockSendButton); // CSS fallback succeeds

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        // Should try XPath first
        expect(mockBrowserWindow.document.evaluate).toHaveBeenCalledWith(
          '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[2]/div[2]/button',
          expect.any(Object),
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        
        // Then fall back to CSS
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div > div.flex.items-center.justify-between > div.flex.items-center.gap-3 > button'
        );
      }, { timeout: 6000 });
    });

    test('uses generic send button selector as final fallback', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock specific selectors to fail, generic to succeed
      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: null }); // XPath send button fails
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(null) // Specific CSS fails
        .mockReturnValueOnce(mockSendButton); // Generic succeeds

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar button[type="submit"], #chat-bar button:last-child'
        );
      }, { timeout: 6000 });
    });
  });

  describe('Error Scenarios', () => {
    test('handles document access errors', async () => {
      const mockRestrictedWindow = {
        document: null,
        close: jest.fn()
      };
      
      mockWindowOpen.mockReturnValue(mockRestrictedWindow);

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      // Should handle error and fall back
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test response message');
      }, { timeout: 6000 });
    });

    test('handles element interaction exceptions', async () => {
      const mockChatInput = {
        focus: jest.fn().mockImplementation(() => {
          throw new Error('Focus failed');
        }),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };

      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: mockChatInput
      });

      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      // Should handle error and fall back
      await waitFor(() => {
        expect(mockBrowserWindow.close).toHaveBeenCalled();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test response message');
      }, { timeout: 6000 });
    });

    test('handles clipboard write failures', async () => {
      navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard failed'));
      
      mockWindowOpen.mockReturnValue(null); // Force fallback path
      
      render(<ListAgentRuns />);
      
      await waitFor(() => {
        expect(screen.getByText(/agent runs/i)).toBeInTheDocument();
      });

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      // Should handle clipboard failure gracefully
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test response message');
      });
    });
  });
});
