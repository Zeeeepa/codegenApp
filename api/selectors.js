/**
 * Codegen website selectors for automation
 * These selectors are used to find elements on the Codegen chat interface
 */

const SELECTORS = {
  // Chat input selectors (in order of preference)
  CHAT_INPUT: [
    // Primary XPath selector
    '//*[@id="chat-bar"]/div/div[2]/div/form/fieldset/div/div[1]/div/textarea',
    // Fallback XPath selectors
    '//*[@id="chat-bar"]//textarea',
    '//*[@id="chat-bar"]//input[@type="text"]',
    // CSS selectors
    '#chat-bar textarea',
    '#chat-bar input[type="text"]',
    // Generic selectors
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="Message" i]',
    'textarea[placeholder*="type" i]',
    'input[placeholder*="message" i]',
    'input[placeholder*="Message" i]'
  ],

  // Send button selectors (in order of preference)
  SEND_BUTTON: [
    // Primary XPath selectors
    '//*[@id="chat-bar"]//button[contains(@class, "send") or @type="submit" or contains(text(), "Send")]',
    '//*[@id="chat-bar"]//button[@type="submit"]',
    // CSS selectors
    '#chat-bar button[type="submit"]',
    '#chat-bar button:last-child',
    '#chat-bar button[class*="send"]',
    // Generic selectors
    'button[type="submit"]',
    'button:contains("Send")',
    'button[aria-label*="send" i]',
    'button[title*="send" i]'
  ],

  // Loading indicators
  LOADING_INDICATORS: [
    '.loading',
    '.spinner',
    '[data-loading="true"]',
    '.chat-loading'
  ],

  // Error indicators
  ERROR_INDICATORS: [
    '.error',
    '.alert-error',
    '[role="alert"]'
  ]
};

/**
 * Wait for an element to be present and visible
 * @param {Page} page - Puppeteer page instance
 * @param {string[]} selectors - Array of selectors to try
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<ElementHandle|null>}
 */
async function waitForElement(page, selectors, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        let element;
        
        // Check if it's an XPath selector
        if (selector.startsWith('//') || selector.startsWith('//*')) {
          const elements = await page.$x(selector);
          if (elements.length > 0) {
            element = elements[0];
          }
        } else {
          // CSS selector
          element = await page.$(selector);
        }
        
        if (element) {
          // Check if element is visible
          const isVisible = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0;
          });
          
          if (isVisible) {
            return element;
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

/**
 * Find chat input element
 * @param {Page} page - Puppeteer page instance
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<ElementHandle|null>}
 */
async function findChatInput(page, timeout = 10000) {
  return await waitForElement(page, SELECTORS.CHAT_INPUT, timeout);
}

/**
 * Find send button element
 * @param {Page} page - Puppeteer page instance
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<ElementHandle|null>}
 */
async function findSendButton(page, timeout = 10000) {
  return await waitForElement(page, SELECTORS.SEND_BUTTON, timeout);
}

/**
 * Wait for page to load completely
 * @param {Page} page - Puppeteer page instance
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForPageLoad(page, timeout = 30000) {
  try {
    // Wait for network to be idle (Puppeteer method)
    await page.waitForLoadState ? 
      await page.waitForLoadState('networkidle', { timeout }) :
      await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for chat interface to be ready
    await page.waitForFunction(() => {
      return document.querySelector('#chat-bar') || 
             document.querySelector('textarea[placeholder*="message" i]') ||
             document.querySelector('input[placeholder*="message" i]');
    }, { timeout: 15000 });
    
  } catch (error) {
    // Continue even if some waits fail
    console.warn('Page load wait partially failed:', error.message);
  }
}

/**
 * Check for errors on the page
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<string|null>} Error message if found, null otherwise
 */
async function checkForErrors(page) {
  try {
    const errorElement = await waitForElement(page, SELECTORS.ERROR_INDICATORS, 2000);
    if (errorElement) {
      const errorText = await errorElement.evaluate(el => el.textContent);
      return errorText;
    }
    return null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  SELECTORS,
  waitForElement,
  findChatInput,
  findSendButton,
  waitForPageLoad,
  checkForErrors
};
