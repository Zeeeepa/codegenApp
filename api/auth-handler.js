/**
 * Authentication handler for Codegen automation
 * Manages authentication context transfer from frontend to backend automation
 */

const logger = require('./logger');
const ChromeCookieExtractor = require('./chrome-cookie-extractor');

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
    let cookiesToSet = [];
    
    // Set cookies if provided
    if (authContext.cookies && Array.isArray(authContext.cookies) && authContext.cookies.length > 0) {
      logger.info(`Setting ${authContext.cookies.length} cookies from auth context`);
      cookiesToSet = authContext.cookies;
    } else {
      // Try to extract cookies from Chrome if none provided
      logger.info('No cookies in auth context, attempting to extract from Chrome browser');
      try {
        const extractor = new ChromeCookieExtractor();
        const chromeCookies = await extractor.getCookiesForDomain('codegen.com');
        if (chromeCookies && chromeCookies.length > 0) {
          cookiesToSet = extractor.toPuppeteerFormat(chromeCookies);
          logger.info(`Extracted ${cookiesToSet.length} cookies from Chrome browser`);
          
          // Log cookie details for debugging (without values for security)
          cookiesToSet.forEach(cookie => {
            logger.info(`Chrome cookie: ${cookie.name} (domain: ${cookie.domain}, secure: ${cookie.secure})`);
          });
        } else {
          logger.warn('No cookies found in Chrome browser for codegen.com');
        }
      } catch (chromeError) {
        logger.warn('Failed to extract cookies from Chrome:', chromeError.message);
      }
    }
    
    if (cookiesToSet.length > 0) {
      logger.info(`Setting ${cookiesToSet.length} cookies`);
      
      // Filter and fix cookies for codegen.com domain
      const validCookies = cookiesToSet
        .filter(cookie => cookie.name && cookie.value)
        .map(cookie => {
          // Ensure proper domain format for codegen.com
          let domain = cookie.domain;
          if (!domain || (!domain.includes('codegen.com'))) {
            domain = '.codegen.com';
          }
          
          return {
            ...cookie,
            domain: domain,
            url: 'https://codegen.com', // Add URL for proper cookie setting
            // Ensure secure cookies for HTTPS
            secure: true,
            // Handle sameSite properly
            sameSite: cookie.sameSite || 'None'
          };
        });
      
      if (validCookies.length > 0) {
        try {
          await page.setCookie(...validCookies);
          logger.info(`Successfully set ${validCookies.length} cookies for codegen.com`);
          
          // Verify cookies were set
          const setCookies = await page.cookies('https://codegen.com');
          logger.info(`Verified ${setCookies.length} cookies are now set for codegen.com`);
        } catch (cookieError) {
          logger.error('Failed to set cookies:', cookieError.message);
          // Try setting cookies one by one to identify problematic ones
          for (const cookie of validCookies) {
            try {
              await page.setCookie(cookie);
              logger.info(`Successfully set individual cookie: ${cookie.name}`);
            } catch (individualError) {
              logger.warn(`Failed to set cookie ${cookie.name}:`, individualError.message);
            }
          }
        }
      }
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
    // Wait for page to load - use setTimeout instead of deprecated waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 2000));

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
        document.querySelector('textarea[placeholder*="message" i]') ||
        document.querySelector('textarea[placeholder*="type" i]') ||
        document.querySelector('input[placeholder*="message" i]')
      );

      // Check if we're on the agent trace page (good sign)
      const isOnTracePage = window.location.href.includes('/agent/trace/');
      
      // Check for error pages or redirects
      const hasError = !!(
        document.querySelector('.error') ||
        document.querySelector('[class*="error"]') ||
        document.title.toLowerCase().includes('error') ||
        document.title.toLowerCase().includes('not found')
      );

      return {
        hasLoginButton,
        hasUserProfile,
        hasChatInterface,
        isOnTracePage,
        hasError,
        url: window.location.href,
        title: document.title,
        bodyClasses: document.body.className
      };
    });

    logger.info('Authentication check results', authChecks);

    // Check if we're redirected to login page
    const isOnLoginPage = authChecks.url.includes('/login') || authChecks.url.includes('/signin');
    
    // More robust authentication check:
    // - If we're redirected to login page, definitely not authenticated
    // - If we have a chat interface, assume authenticated
    // - If we have user profile indicators, assume authenticated
    // - If we're on the trace page and don't have obvious login buttons, assume authenticated
    const isAuthenticated = !isOnLoginPage && (
      authChecks.hasChatInterface ||
      authChecks.hasUserProfile ||
      (authChecks.isOnTracePage && !authChecks.hasLoginButton && !authChecks.hasError)
    );

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
