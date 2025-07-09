/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumeAgentRunDialog } from '../components/ResumeAgentRunDialog';

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
    getAgentRun: jest.fn().mockResolvedValue({
      id: 123,
      status: 'stopped',
      prompt: 'Test prompt',
      created_at: '2024-01-01T00:00:00Z'
    })
  })
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

// Mock window.open
const mockWindowOpen = jest.fn();
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

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  agentRunId: 123,
  organizationId: 456,
  onResumed: jest.fn()
};

describe('Browser Automation Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockReturnValue(mockBrowserWindow);
  });

  describe('ResumeAgentRunDialog Browser Automation', () => {

    test('opens invisible browser window with correct parameters', async () => {
      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Test automation message');
      await userEvent.click(resumeButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://codegen.com/agent/trace/123',
        '_blank',
        'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no'
      );
    });

    test('handles popup blocker gracefully', async () => {
      mockWindowOpen.mockReturnValue(null);
      
      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Test message');
      await userEvent.click(resumeButton);
      
      // Should fall back to manual approach
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test message');
      });
    });

    test('uses XPath selector to find chat input', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock XPath evaluation to return chat input
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: mockChatInput
      });
      
      // Mock XPath evaluation for send button
      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: mockSendButton });

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'XPath test message');
      await userEvent.click(resumeButton);

      // Wait for automation to complete
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

    test('falls back to CSS selector when XPath fails', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock XPath to fail, CSS selector to succeed
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: null
      });
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(mockChatInput)
        .mockReturnValueOnce(mockSendButton);

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'CSS fallback test');
      await userEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div'
        );
      }, { timeout: 6000 });
    });

    test('triggers React input events correctly', async () => {
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

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'React events test');
      await userEvent.click(resumeButton);

      await waitFor(() => {
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

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Close window test');
      await userEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockBrowserWindow.close).toHaveBeenCalled();
      }, { timeout: 6000 });
    });

    test('handles automation failure gracefully', async () => {
      // Mock XPath and CSS selectors to fail
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: null
      });
      mockBrowserWindow.document.querySelector.mockReturnValue(null);

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Failure test');
      await userEvent.click(resumeButton);

      // Should fall back to manual approach
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Failure test');
        expect(mockBrowserWindow.close).toHaveBeenCalled();
      }, { timeout: 6000 });
    });

    test('validates prompt input before automation', async () => {
      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      // Try to submit without entering a prompt
      await userEvent.click(resumeButton);
      
      // Should not open browser window
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    test('uses correct chat URL format', async () => {
      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'URL test');
      await userEvent.click(resumeButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://codegen.com/agent/trace/123',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Element Selection Strategies', () => {
    test('tries multiple send button selectors', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock chat input found, but send button requires fallback
      mockBrowserWindow.document.evaluate
        .mockReturnValueOnce({ singleNodeValue: mockChatInput })
        .mockReturnValueOnce({ singleNodeValue: null }); // First send button XPath fails
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(mockSendButton); // CSS fallback succeeds

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Send button fallback test');
      await userEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div > div.flex.items-center.justify-between > div.flex.items-center.gap-3 > button'
        );
      }, { timeout: 6000 });
    });

    test('uses generic selectors as final fallback', async () => {
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'INPUT',
        value: '',
        dispatchEvent: jest.fn()
      };
      
      const mockSendButton = {
        click: jest.fn()
      };

      // Mock specific selectors to fail, generic to succeed
      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: null
      });
      
      mockBrowserWindow.document.querySelector
        .mockReturnValueOnce(null) // Specific CSS fails
        .mockReturnValueOnce(mockChatInput) // Generic input selector succeeds
        .mockReturnValueOnce(null) // Specific send button fails
        .mockReturnValueOnce(mockSendButton); // Generic send button succeeds

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Generic selector test');
      await userEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar textarea, #chat-bar input[type="text"]'
        );
        expect(mockBrowserWindow.document.querySelector).toHaveBeenCalledWith(
          '#chat-bar button[type="submit"], #chat-bar button:last-child'
        );
      }, { timeout: 6000 });
    });
  });

  describe('Error Handling', () => {
    test('handles document access errors', async () => {
      // Mock browser window without document access
      const mockRestrictedWindow = {
        document: null,
        close: jest.fn()
      };
      
      mockWindowOpen.mockReturnValue(mockRestrictedWindow);

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Document access error test');
      await userEvent.click(resumeButton);

      // Should handle error and fall back
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Document access error test');
      }, { timeout: 6000 });
    });

    test('handles element interaction errors', async () => {
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

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Element interaction error test');
      await userEvent.click(resumeButton);

      // Should handle error and fall back
      await waitFor(() => {
        expect(mockBrowserWindow.close).toHaveBeenCalled();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Element interaction error test');
      }, { timeout: 6000 });
    });
  });

  describe('Timing and Async Behavior', () => {
    test('waits for page load before automation', async () => {
      jest.useFakeTimers();
      
      const mockChatInput = {
        focus: jest.fn(),
        tagName: 'TEXTAREA',
        value: '',
        dispatchEvent: jest.fn()
      };

      mockBrowserWindow.document.evaluate.mockReturnValue({
        singleNodeValue: mockChatInput
      });

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Timing test');
      await userEvent.click(resumeButton);

      // Should not immediately try to access document
      expect(mockBrowserWindow.document.evaluate).not.toHaveBeenCalled();
      
      // Fast-forward past initial wait
      jest.advanceTimersByTime(2000);
      
      // Still should not access document (waiting for additional load time)
      expect(mockBrowserWindow.document.evaluate).not.toHaveBeenCalled();
      
      // Fast-forward past additional wait
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(mockBrowserWindow.document.evaluate).toHaveBeenCalled();
      });
      
      jest.useRealTimers();
    });

    test('waits between input and send button click', async () => {
      jest.useFakeTimers();
      
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

      render(<ResumeAgentRunDialog {...defaultProps} />);
      
      const promptInput = screen.getByLabelText(/resume prompt/i);
      const resumeButton = screen.getByRole('button', { name: /resume agent run/i });
      
      await userEvent.type(promptInput, 'Input timing test');
      await userEvent.click(resumeButton);

      // Fast-forward to automation start
      jest.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(mockChatInput.dispatchEvent).toHaveBeenCalled();
      });
      
      // Send button should not be clicked immediately
      expect(mockSendButton.click).not.toHaveBeenCalled();
      
      // Fast-forward past React processing wait
      jest.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(mockSendButton.click).toHaveBeenCalled();
      });
      
      jest.useRealTimers();
    });
  });
});
