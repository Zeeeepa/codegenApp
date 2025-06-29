const puppeteer = require('puppeteer');

async function testWorkflow() {
  console.log('🚀 Starting Agent Run Workflow Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📱 Opening application...');
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-1-homepage.png' });
    console.log('📸 Screenshot saved: test-1-homepage.png');
    
    // Look for the create run button
    console.log('🔍 Looking for create run button...');
    const createButton = await page.$('button[data-testid="create-run"], button:contains("Create"), button:contains("New")');
    
    if (createButton) {
      console.log('✅ Found create button, clicking...');
      await createButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-2-create-dialog.png' });
      console.log('📸 Screenshot saved: test-2-create-dialog.png');
    } else {
      console.log('❌ Create button not found, checking page content...');
      const content = await page.content();
      console.log('Page title:', await page.title());
    }
    
    // Check for agent runs list
    console.log('📋 Checking for agent runs list...');
    await page.screenshot({ path: 'test-3-final-state.png' });
    console.log('📸 Screenshot saved: test-3-final-state.png');
    
    console.log('✅ Workflow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

testWorkflow().catch(console.error);
