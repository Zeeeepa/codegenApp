/**
 * Main automation service for resuming Codegen agent runs
 * Uses Puppeteer for headless browser automation
 */

const puppeteer = require('puppeteer');
const logger = require('./logger');
const { findChatInput, findSendButton, waitForPageLoad, checkForErrors } = require('./selectors');
const { applyAuthContext, checkAuthentication, validateAuthContext } = require('./auth-handler');

/**
 * Resume an agent run by automating the Codegen chat interface
 * @param {Object} params - Parameters for resuming agent run
 * @param {number} params.agentRunId - ID of the agent run to resume
 * @param {number} params.organizationId - Organization ID
 * @param {string} params.prompt - Message to send to resume the agent
 * @param {Object} params.authContext - Authentication context from frontend
 * @returns {Promise<Object>} Result of the automation
 */
async function resumeAgentRun({ agentRunId, organizationId, prompt, authContext }) {
  const startTime = Date.now();
  let browser = null;
  let page = null;

  try {
    logger.info('Starting agent run resume automation', {
      agentRunId,
      organizationId,
      promptLength: prompt.length,
      hasAuth: !!authContext
    });

    // Validate authentication context
    if (!validateAuthContext(authContext)) {
      throw new Error('Invalid or missing authentication context');
    }

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true, // Truly headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Apply authentication context
    await applyAuthContext(page, authContext);

    // Navigate to agent run page
    const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
    logger.info('Navigating to agent run page', { chatUrl });

    await page.goto(chatUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for page to fully load
    await waitForPageLoad(page);

    // Check for errors on the page
    const pageError = await checkForErrors(page);
    if (pageError) {
      throw new Error(`Page error detected: ${pageError}`);
    }

    // Verify authentication
    const isAuthenticated = await checkAuthentication(page);
    if (!isAuthenticated) {
      throw new Error('Authentication failed - user not logged in to Codegen');
    }

    logger.info('Page loaded and authenticated successfully');

    // Find chat input element
    logger.info('Looking for chat input element');
    const chatInput = await findChatInput(page, 15000);
    
    if (!chatInput) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-no-input.png', fullPage: true });
      throw new Error('Could not find chat input element');
    }

    logger.info('Chat input found, entering text');

    // Focus and clear the input
    await chatInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

    // Type the prompt
    await chatInput.type(prompt, { delay: 50 });

    // Wait a moment for React to process the input
    await page.waitForTimeout(1000);

    // Find and click send button
    logger.info('Looking for send button');
    const sendButton = await findSendButton(page, 10000);
    
    if (!sendButton) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-no-button.png', fullPage: true });
      throw new Error('Could not find send button');
    }

    logger.info('Send button found, clicking to send message');

    // Click the send button
    await sendButton.click();

    // Wait for message to be sent (look for loading indicators or new message)
    await page.waitForTimeout(2000);

    // Verify message was sent by checking if input is cleared or disabled
    const inputValue = await chatInput.evaluate(el => el.value);
    const isInputDisabled = await chatInput.evaluate(el => el.disabled);

    if (inputValue === prompt && !isInputDisabled) {
      logger.warn('Message may not have been sent - input still contains text');
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-not-sent.png', fullPage: true });
    }

    // Check for any errors after sending
    const sendError = await checkForErrors(page);
    if (sendError) {
      throw new Error(`Error after sending message: ${sendError}`);
    }

    const duration = Date.now() - startTime;

    logger.info('Agent run resume completed successfully', {
      agentRunId,
      duration,
      promptLength: prompt.length
    });

    return {
      success: true,
      message: `Agent run #${agentRunId} resumed successfully`,
      duration,
      agentRunId,
      organizationId
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Agent run resume failed', {
      agentRunId,
      organizationId,
      error: error.message,
      stack: error.stack,
      duration
    });

    // Take screenshot for debugging if page exists
    if (page) {
      try {
        await page.screenshot({ path: `debug-error-${agentRunId}.png`, fullPage: true });
      } catch (screenshotError) {
        logger.error('Failed to take debug screenshot', { error: screenshotError.message });
      }
    }

    return {
      success: false,
      error: error.message,
      duration,
      agentRunId,
      organizationId
    };

  } finally {
    // Clean up browser resources
    if (page) {
      try {
        await page.close();
      } catch (error) {
        logger.error('Failed to close page', { error: error.message });
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        logger.error('Failed to close browser', { error: error.message });
      }
    }
  }
}

/**
 * Test the automation service with a dry run
 * @param {Object} params - Test parameters
 * @returns {Promise<Object>} Test results
 */
async function testAutomation({ agentRunId, authContext }) {
  let browser = null;
  let page = null;

  try {
    logger.info('Starting automation test', { agentRunId });

    if (!validateAuthContext(authContext)) {
      throw new Error('Invalid or missing authentication context');
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await applyAuthContext(page, authContext);

    const chatUrl = `https://codegen.com/agent/trace/${agentRunId}`;
    await page.goto(chatUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForPageLoad(page);

    const isAuthenticated = await checkAuthentication(page);
    const chatInput = await findChatInput(page, 10000);
    const sendButton = await findSendButton(page, 10000);

    return {
      success: true,
      results: {
        pageLoaded: true,
        authenticated: isAuthenticated,
        chatInputFound: !!chatInput,
        sendButtonFound: !!sendButton,
        url: chatUrl
      }
    };

  } catch (error) {
    logger.error('Automation test failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };

  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

module.exports = {
  resumeAgentRun,
  testAutomation
};

