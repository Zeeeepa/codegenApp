const puppeteer = require('puppeteer');

/**
 * Agent Continuation Automation
 * ONLY USE CASE: Provide "continue" functionality for agent runs
 * - Opens Chrome in background (headless, NOT VISIBLE)
 * - Retrieves cookies from Chrome
 * - Loads cookies into background Chrome
 * - Opens URL for agent's trace
 * - Finds text input chat area
 * - Inputs user's inputted text
 * - Submits the input
 * - Updates agent run state to active
 */
async function continueAgentRun(agentRunId, userInputText, authCookies = []) {
  console.log('🤖 Starting Agent Continuation Automation...');
  console.log(`📋 Agent Run ID: ${agentRunId}`);
  console.log(`💬 User Input: ${userInputText}`);
  
  // Launch headless Chrome (background, NOT VISIBLE)
  const browser = await puppeteer.launch({ 
    headless: true,  // Background mode - NOT VISIBLE
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Load authentication cookies into background Chrome
    if (authCookies && authCookies.length > 0) {
      console.log(`🍪 Loading ${authCookies.length} authentication cookies...`);
      await page.setCookie(...authCookies);
    }
    
    // Navigate to agent's trace URL
    const traceUrl = `https://codegen.com/agent/trace/${agentRunId}`;
    console.log(`🌐 Opening agent trace: ${traceUrl}`);
    await page.goto(traceUrl);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find text input chat area
    console.log('🔍 Finding chat input area...');
    const chatInput = await page.$('textarea') || 
                     await page.$('input[type="text"]') ||
                     await page.$('[placeholder*="message" i]') ||
                     await page.$('[placeholder*="type" i]');
    
    if (!chatInput) {
      throw new Error('Chat input area not found');
    }
    
    console.log('✅ Found chat input area');
    
    // Input user's text
    console.log('⌨️ Typing user input...');
    await chatInput.click();
    await chatInput.type(userInputText);
    
    // Submit the input (press Enter or find submit button)
    console.log('📤 Submitting input...');
    try {
      await chatInput.press('Enter');
    } catch (e) {
      // Try to find and click submit button if Enter doesn't work
      const submitButton = await page.$('button[type="submit"]') ||
                          await page.$('button:contains("Send")') ||
                          await page.$('[aria-label*="send" i]');
      if (submitButton) {
        await submitButton.click();
      } else {
        throw new Error('Could not submit input - no Enter key or submit button found');
      }
    }
    
    // Wait for submission to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Agent continuation completed successfully!');
    console.log('🔄 Agent run state should now be active');
    
    return {
      success: true,
      message: 'Agent continuation completed successfully',
      agentRunId,
      traceUrl
    };
    
  } catch (error) {
    console.error('❌ Agent continuation failed:', error.message);
    return {
      success: false,
      error: error.message,
      agentRunId,
      traceUrl: `https://codegen.com/agent/trace/${agentRunId}`
    };
  } finally {
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { continueAgentRun };

// CLI usage for testing
if (require.main === module) {
  const agentRunId = process.argv[2] || '45771';
  const userInputText = process.argv[3] || 'Please continue with the task';
  
  continueAgentRun(agentRunId, userInputText)
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
