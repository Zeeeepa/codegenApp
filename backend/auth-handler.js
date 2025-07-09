/**
 * Authentication handler for Codegen automation
 * Manages authentication context transfer from frontend to backend automation
 */

const logger = require('./logger');

/**
 * Apply authentication context to a Puppeteer page
 * @param {Page} page - Puppeteer page instance
 * @param {Object} authContext - Authentication context from frontend
 */
async function applyAuthContext(page, authContext) {
  if (!authContext) {
    logger.warn('No authentication context provided');
    return;
  }

  try {
    // Set cookies if provided
    if (authContext.cookies && Array.isArray(authContext.cookies)) {
      logger.info(`Setting ${authContext.cookies.length} cookies`);
      await page.setCookie(...authContext.cookies);
    }

    // Set local storage if provided
    if (authContext.localStorage) {
      logger.info('Setting localStorage items');
      await page.evaluateOnNewDocument((localStorage) => {
        for (const [key, value] of Object.entries(localStorage)) {
          window.localStorage.setItem(key, value);
        }
      }, authContext.localStorage);
    }

    // Set session storage if provided
    if (authContext.sessionStorage) {
      logger.info('Setting sessionStorage items');
      await page.evaluateOnNewDocument((sessionStorage) => {
        for (const [key, value] of Object.entries(sessionStorage)) {
          window.sessionStorage.setItem(key, value);
        }
      }, authContext.sessionStorage);
    }

    // Set custom headers if provided
    if (authContext.headers) {
      logger.info('Setting custom headers');
      await page.setExtraHTTPHeaders(authContext.headers);
    }

    // Set user agent if provided
    if (authContext.userAgent) {
      logger.info('Setting custom user agent');
      await page.setUserAgent(authContext.userAgent);
    }

    logger.info('Authentication context applied successfully');

  } catch (error) {
    logger.error('Failed to apply authentication context', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Authentication setup failed: ${error.message}`);
  }
}

/**
 * Extract authentication context from browser (for frontend use)
 * This function provides JavaScript code that can be executed in the frontend
 * to extract authentication context
 */
function getAuthExtractionScript() {
  return `
    (async function extractAuthContext() {
      try {
        // Extract cookies
        const cookies = document.cookie.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=');
          return {
            name: name,
            value: value || '',
            domain: window.location.hostname,
            path: '/',
            httpOnly: false,
            secure: window.location.protocol === 'https:'
          };
        }).filter(cookie => cookie.name && cookie.value);

        // Extract localStorage
        const localStorage = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          localStorage[key] = window.localStorage.getItem(key);
        }

        // Extract sessionStorage
        const sessionStorage = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          sessionStorage[key] = window.sessionStorage.getItem(key);
        }

        // Get user agent
        const userAgent = navigator.userAgent;

        return {
          cookies: cookies,
          localStorage: localStorage,
          sessionStorage: sessionStorage,
          userAgent: userAgent,
          origin: window.location.origin,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to extract auth context:', error);
        return null;
      }
    })();
  `;
}

/**
 * Validate authentication context
 * @param {Object} authContext - Authentication context to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateAuthContext(authContext) {
  if (!authContext || typeof authContext !== 'object') {
    return false;
  }

  // Check if we have at least some authentication data
  const hasCookies = authContext.cookies && Array.isArray(authContext.cookies) && authContext.cookies.length > 0;
  const hasLocalStorage = authContext.localStorage && Object.keys(authContext.localStorage).length > 0;
  const hasSessionStorage = authContext.sessionStorage && Object.keys(authContext.sessionStorage).length > 0;
  const hasHeaders = authContext.headers && Object.keys(authContext.headers).length > 0;

  return hasCookies || hasLocalStorage || hasSessionStorage || hasHeaders;
}

/**
 * Check if user is authenticated on the page
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
async function checkAuthentication(page) {
  try {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for common authentication indicators
    const authChecks = await page.evaluate(() => {
      // Check for login/signin buttons (indicates not authenticated)
      const loginButtons = document.querySelectorAll('button, a, [role="button"]');
      const hasLoginButton = Array.from(loginButtons).some(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('login') || text.includes('sign in') || text.includes('log in');
      });

      // Check for user profile indicators (indicates authenticated)
      const hasUserProfile = !!(
        document.querySelector('[data-testid*="user"]') ||
        document.querySelector('[class*="user"]') ||
        document.querySelector('[class*="profile"]') ||
        document.querySelector('[class*="avatar"]')
      );

      // Check for chat interface (indicates authenticated)
      const hasChatInterface = !!(
        document.querySelector('#chat-bar') ||
        document.querySelector('[class*="chat"]') ||
        document.querySelector('textarea[placeholder*="message" i]')
      );

      return {
        hasLoginButton,
        hasUserProfile,
        hasChatInterface,
        url: window.location.href,
        title: document.title
      };
    });

    logger.info('Authentication check results', authChecks);

    // If we have a chat interface and no login button, likely authenticated
    const isAuthenticated = authChecks.hasChatInterface && !authChecks.hasLoginButton;

    return isAuthenticated;

  } catch (error) {
    logger.error('Authentication check failed', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

module.exports = {
  applyAuthContext,
  getAuthExtractionScript,
  validateAuthContext,
  checkAuthentication
};

