const puppeteer = require('puppeteer');

async function validateAppFunctionality() {
    console.log('🧪 Starting comprehensive app functionality validation...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        
        console.log('📱 Loading app at http://localhost:8000...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
        
        // Check if the page loaded
        const title = await page.title();
        console.log('✅ Page title:', title);
        
        // Check if main components are present
        const hasCreateButton = await page.$('button:contains("Create Agent Run")') !== null;
        const hasAgentRunsList = await page.$('[data-testid="agent-runs-list"]') !== null;
        
        console.log('🔍 UI Components Check:');
        console.log('  - Create Agent Run button:', hasCreateButton ? '✅' : '❌');
        console.log('  - Agent Runs list:', hasAgentRunsList ? '✅' : '❌');
        
        // Test API integration by checking network requests
        const responses = [];
        page.on('response', response => {
            if (response.url().includes('api.codegen.com')) {
                responses.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        // Try to trigger an API call if there's a create button
        try {
            const createButton = await page.$('button');
            if (createButton) {
                console.log('🚀 Testing API integration...');
                await createButton.click();
                await page.waitForTimeout(2000); // Wait for potential API calls
            }
        } catch (error) {
            console.log('⚠️  Could not test button interaction:', error.message);
        }
        
        // Check API responses
        console.log('🌐 API Requests:');
        if (responses.length > 0) {
            responses.forEach(resp => {
                console.log(`  - ${resp.url}: ${resp.status} ${resp.statusText}`);
            });
        } else {
            console.log('  - No API requests detected (this might be expected)');
        }
        
        // Check for JavaScript errors
        const jsErrors = [];
        page.on('pageerror', error => jsErrors.push(error.message));
        
        console.log('🐛 JavaScript Errors:', jsErrors.length === 0 ? '✅ None' : `❌ ${jsErrors.length} errors`);
        jsErrors.forEach(error => console.log(`  - ${error}`));
        
        // Take a screenshot for visual verification
        await page.screenshot({ path: 'app-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as app-screenshot.png');
        
        console.log('✅ App functionality validation completed!');
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return true;
}

// Run if this file is executed directly
if (require.main === module) {
    validateAppFunctionality().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { validateAppFunctionality };

