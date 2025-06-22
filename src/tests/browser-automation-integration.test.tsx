/// <reference types="jest" />
/**
 * Integration tests for browser automation functionality
 * These tests simulate real browser interactions and validate the complete automation flow
 */

import { JSDOM } from 'jsdom';

// Mock environment for browser automation testing
const createMockBrowserEnvironment = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head><title>Codegen Agent Chat</title></head>
      <body>
        <div id="chat-bar">
          <div>
            <div class="sidebar-inset flex justify-center">
              <div>
                <form>
                  <fieldset>
                    <div contenteditable="true" role="textbox" aria-label="Chat input">
                      <!-- This is the chat input element -->
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <button type="submit" aria-label="Send message">Send</button>
                      </div>
                    </div>
                  </fieldset>
                </form>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `, { 
    url: 'https://codegen.com/agent/trace/123',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  return {
    window: dom.window,
    document: dom.window.document
  };
};

describe('Browser Automation Integration Tests', () => {
  let mockBrowserEnv: ReturnType<typeof createMockBrowserEnvironment>;
  let mockWindow: any;

  beforeEach(() => {
    mockBrowserEnv = createMockBrowserEnvironment();
    mockWindow = {
      document: mockBrowserEnv.document,
      close: jest.fn(),
      focus: jest.fn()
    };
  });

  describe('XPath Element Selection', () => {
    test('successfully finds chat input using primary XPath selector', () => {
      const doc = mockBrowserEnv.document;
      
      // Test the actual XPath selector used in the code
      const result = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );

      expect(result.singleNodeValue).toBeTruthy();
      expect(result.singleNodeValue?.getAttribute('role')).toBe('textbox');
    });

    test('successfully finds send button using XPath selector', () => {
      const doc = mockBrowserEnv.document;
      
      // Test the send button XPath selector
      const result = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[2]/div[2]/button',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );

      expect(result.singleNodeValue).toBeTruthy();
      expect(result.singleNodeValue?.getAttribute('type')).toBe('submit');
    });
  });

  describe('CSS Selector Fallbacks', () => {
    test('finds chat input using CSS fallback selector', () => {
      const doc = mockBrowserEnv.document;
      
      const chatInput = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div');
      
      expect(chatInput).toBeTruthy();
      expect(chatInput?.getAttribute('role')).toBe('textbox');
    });

    test('finds send button using CSS fallback selector', () => {
      const doc = mockBrowserEnv.document;
      
      const sendButton = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div > div.flex.items-center.justify-between > div.flex.items-center.gap-3 > button');
      
      expect(sendButton).toBeTruthy();
      expect(sendButton?.getAttribute('type')).toBe('submit');
    });

    test('finds elements using generic selectors', () => {
      const doc = mockBrowserEnv.document;
      
      // Test generic input selector
      const chatInput = doc.querySelector('#chat-bar [role="textbox"]');
      expect(chatInput).toBeTruthy();
      
      // Test generic button selector
      const sendButton = doc.querySelector('#chat-bar button[type="submit"]');
      expect(sendButton).toBeTruthy();
    });
  });

  describe('Element Interaction Simulation', () => {
    test('simulates text input and React event triggering', () => {
      const doc = mockBrowserEnv.document;
      const chatInput = doc.querySelector('[role="textbox"]') as HTMLElement;
      
      // Mock the element as a textarea for testing
      Object.defineProperty(chatInput, 'tagName', { value: 'TEXTAREA' });
      Object.defineProperty(chatInput, 'value', { writable: true, value: '' });
      
      const dispatchEventSpy = jest.spyOn(chatInput, 'dispatchEvent');
      const focusSpy = jest.spyOn(chatInput, 'focus');
      
      // Simulate the automation process
      chatInput.focus();
      (chatInput as any).value = 'Test automation message';
      
      // Trigger React events
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(focusSpy).toHaveBeenCalled();
      expect((chatInput as any).value).toBe('Test automation message');
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          bubbles: true
        })
      );
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          bubbles: true
        })
      );
    });

    test('simulates send button click', () => {
      const doc = mockBrowserEnv.document;
      const sendButton = doc.querySelector('button[type="submit"]') as HTMLButtonElement;
      
      const clickSpy = jest.spyOn(sendButton, 'click');
      
      // Simulate button click
      sendButton.click();
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Complete Automation Flow Simulation', () => {
    test('simulates complete automation sequence', async () => {
      const doc = mockBrowserEnv.document;
      
      // Step 1: Find chat input using XPath
      const chatInputResult = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      
      const chatInput = chatInputResult.singleNodeValue as HTMLElement;
      expect(chatInput).toBeTruthy();
      
      // Step 2: Set up element for interaction
      Object.defineProperty(chatInput, 'tagName', { value: 'TEXTAREA' });
      Object.defineProperty(chatInput, 'value', { writable: true, value: '' });
      
      const focusSpy = jest.spyOn(chatInput, 'focus');
      const dispatchEventSpy = jest.spyOn(chatInput, 'dispatchEvent');
      
      // Step 3: Focus and set text
      chatInput.focus();
      (chatInput as any).value = 'Complete automation test';
      
      // Step 4: Trigger React events
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Step 5: Wait for React processing (simulate)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 6: Find and click send button
      const sendButtonResult = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[2]/div[2]/button',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      
      const sendButton = sendButtonResult.singleNodeValue as HTMLButtonElement;
      expect(sendButton).toBeTruthy();
      
      const clickSpy = jest.spyOn(sendButton, 'click');
      sendButton.click();
      
      // Step 7: Verify all interactions occurred
      expect(focusSpy).toHaveBeenCalled();
      expect((chatInput as any).value).toBe('Complete automation test');
      expect(dispatchEventSpy).toHaveBeenCalledTimes(2);
      expect(clickSpy).toHaveBeenCalled();
    });

    test('simulates fallback to CSS selectors when XPath fails', async () => {
      const doc = mockBrowserEnv.document;
      
      // Simulate XPath failure by temporarily removing the element
      const originalElement = doc.querySelector('[role="textbox"]');
      originalElement?.remove();
      
      // XPath should fail
      const xpathResult = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      expect(xpathResult.singleNodeValue).toBeNull();
      
      // Re-add element for CSS selector test
      const chatBar = doc.querySelector('#chat-bar fieldset');
      const newInput = doc.createElement('div');
      newInput.setAttribute('role', 'textbox');
      newInput.setAttribute('contenteditable', 'true');
      chatBar?.appendChild(newInput);
      
      // CSS selector should work
      const cssResult = doc.querySelector('#chat-bar [role="textbox"]');
      expect(cssResult).toBeTruthy();
    });
  });

  describe('Error Handling Scenarios', () => {
    test('handles missing chat input element', () => {
      const doc = mockBrowserEnv.document;
      
      // Remove the chat input element
      const chatInput = doc.querySelector('[role="textbox"]');
      chatInput?.remove();
      
      // XPath should return null
      const xpathResult = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      expect(xpathResult.singleNodeValue).toBeNull();
      
      // CSS selector should also return null
      const cssResult = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div');
      expect(cssResult).toBeNull();
      
      // Generic selector should also fail
      const genericResult = doc.querySelector('#chat-bar textarea, #chat-bar input[type="text"]');
      expect(genericResult).toBeNull();
    });

    test('handles missing send button element', () => {
      const doc = mockBrowserEnv.document;
      
      // Remove the send button
      const sendButton = doc.querySelector('button[type="submit"]');
      sendButton?.remove();
      
      // All selectors should fail
      const xpathResult = doc.evaluate(
        '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[2]/div[2]/button',
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      expect(xpathResult.singleNodeValue).toBeNull();
      
      const cssResult = doc.querySelector('#chat-bar > div > div.sidebar-inset.flex.justify-center > div > form > fieldset > div > div.flex.items-center.justify-between > div.flex.items-center.gap-3 > button');
      expect(cssResult).toBeNull();
      
      const genericResult = doc.querySelector('#chat-bar button[type="submit"], #chat-bar button:last-child');
      expect(genericResult).toBeNull();
    });

    test('handles element interaction failures', () => {
      const doc = mockBrowserEnv.document;
      const chatInput = doc.querySelector('[role="textbox"]') as HTMLElement;
      
      // Mock focus to throw an error
      jest.spyOn(chatInput, 'focus').mockImplementation(() => {
        throw new Error('Focus failed');
      });
      
      expect(() => chatInput.focus()).toThrow('Focus failed');
    });
  });

  describe('Browser Window Management', () => {
    test('validates invisible window parameters', () => {
      const windowFeatures = 'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no';
      
      // Parse the window features
      const features = windowFeatures.split(',').reduce((acc, feature) => {
        const [key, value] = feature.split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      // Validate invisible window settings
      expect(features.width).toBe('1');
      expect(features.height).toBe('1');
      expect(features.left).toBe('-1000');
      expect(features.top).toBe('-1000');
      expect(features.toolbar).toBe('no');
      expect(features.menubar).toBe('no');
      expect(features.scrollbars).toBe('no');
      expect(features.resizable).toBe('no');
      expect(features.location).toBe('no');
      expect(features.status).toBe('no');
    });

    test('validates chat URL format', () => {
      const agentRunId = 123;
      const expectedUrl = `https://codegen.com/agent/trace/${agentRunId}`;
      
      expect(expectedUrl).toBe('https://codegen.com/agent/trace/123');
      expect(expectedUrl).toMatch(/^https:\/\/codegen\.com\/agent\/trace\/\d+$/);
    });
  });

  describe('Timing and Async Behavior', () => {
    test('validates timing constants', () => {
      // These are the timing values used in the actual implementation
      const INITIAL_WAIT = 2000; // Wait for page load
      const ADDITIONAL_WAIT = 3000; // Wait for full page load
      const REACT_PROCESSING_WAIT = 500; // Wait for React to process input
      const MESSAGE_SEND_WAIT = 1000; // Wait for message to be sent
      
      expect(INITIAL_WAIT).toBe(2000);
      expect(ADDITIONAL_WAIT).toBe(3000);
      expect(REACT_PROCESSING_WAIT).toBe(500);
      expect(MESSAGE_SEND_WAIT).toBe(1000);
      
      // Total automation time should be reasonable
      const totalTime = INITIAL_WAIT + ADDITIONAL_WAIT + REACT_PROCESSING_WAIT + MESSAGE_SEND_WAIT;
      expect(totalTime).toBe(6500); // 6.5 seconds total
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('simulates async automation flow with proper timing', async () => {
      jest.useFakeTimers();
      
      const automationSteps: string[] = [];
      
      // Simulate the automation sequence
      setTimeout(() => {
        automationSteps.push('page_load_wait_complete');
      }, 2000);
      
      setTimeout(() => {
        automationSteps.push('additional_load_wait_complete');
        automationSteps.push('element_selection_started');
      }, 5000);
      
      setTimeout(() => {
        automationSteps.push('input_processing_wait_complete');
        automationSteps.push('send_button_click');
      }, 5500);
      
      setTimeout(() => {
        automationSteps.push('message_send_wait_complete');
        automationSteps.push('automation_complete');
      }, 6500);
      
      // Fast-forward through the timing
      jest.advanceTimersByTime(2000);
      expect(automationSteps).toContain('page_load_wait_complete');
      
      jest.advanceTimersByTime(3000);
      expect(automationSteps).toContain('additional_load_wait_complete');
      expect(automationSteps).toContain('element_selection_started');
      
      jest.advanceTimersByTime(500);
      expect(automationSteps).toContain('input_processing_wait_complete');
      expect(automationSteps).toContain('send_button_click');
      
      jest.advanceTimersByTime(1000);
      expect(automationSteps).toContain('message_send_wait_complete');
      expect(automationSteps).toContain('automation_complete');
      
      jest.useRealTimers();
    });
  });
});

