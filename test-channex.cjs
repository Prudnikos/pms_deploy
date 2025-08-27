const { chromium } = require('playwright');
const path = require('path');

async function testChannexPage() {
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down operations for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  try {
    console.log('Navigating to login page first...');
    
    // First go to login page
    await page.goto('http://localhost:5174/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Filling in login credentials...');
    
    // Fill in email and password
    await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="Enter your email"]', 'admin@test.com');
    await page.fill('input[type="password"], input[placeholder*="password"], input[placeholder*="Enter your password"]', 'password123');
    
    // Click login button
    await page.click('button:has-text("Sign In"), button[type="submit"], .btn:has-text("Sign In")');
    
    console.log('Waiting for login to complete...');
    await page.waitForTimeout(3000);
    
    console.log('Now navigating to channex integration page...');
    
    // Navigate to the Channex integration page
    await page.goto('http://localhost:5174/channexintegration', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Page loaded, taking first screenshot...');
    
    // Take first screenshot
    const screenshot1Path = path.join(__dirname, 'channex-page-initial.png');
    await page.screenshot({ 
      path: screenshot1Path, 
      fullPage: true 
    });
    
    console.log('First screenshot saved to:', screenshot1Path);
    
    // Look for the "Цены на завтра" button
    console.log('Looking for "Цены на завтра" button...');
    
    // Try multiple selectors to find the button
    const buttonSelectors = [
      'button:has-text("Цены на завтра")',
      'button:has-text("цены на завтра")',
      'button[class*="button"]:has-text("Цены")',
      '[role="button"]:has-text("Цены на завтра")',
      'text="Цены на завтра"',
      '*:has-text("Цены на завтра")'
    ];
    
    let buttonFound = false;
    let clickedElement = null;
    
    for (const selector of buttonSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`Found button with selector: ${selector}`);
          clickedElement = element;
          buttonFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
        continue;
      }
    }
    
    if (!buttonFound) {
      console.log('Button "Цены на завтра" not found. Let me check what text elements are available...');
      
      // Get all text content to see what's available
      const allText = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0 && text.length < 100)
          .slice(0, 50); // First 50 text elements
      });
      
      console.log('Available text elements:', allText);
      
      // Try to find any button with "цены" or "завтра" in it
      const partialMatch = await page.locator('button, [role="button"], .btn').locator('text=/цены|завтра/i').first();
      if (await partialMatch.isVisible()) {
        console.log('Found partial match for price/tomorrow button');
        clickedElement = partialMatch;
        buttonFound = true;
      }
    }
    
    if (buttonFound && clickedElement) {
      console.log('Clicking on the button...');
      await clickedElement.click();
      
      console.log('Waiting for page to load after click...');
      // Wait for loading to complete
      await page.waitForTimeout(5000);
      
      // Try to wait for network to be idle after click
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('Network idle timeout, continuing...');
      }
      
      console.log('Taking second screenshot...');
      
      // Take second screenshot
      const screenshot2Path = path.join(__dirname, 'channex-page-after-click.png');
      await page.screenshot({ 
        path: screenshot2Path, 
        fullPage: true 
      });
      
      console.log('Second screenshot saved to:', screenshot2Path);
      
    } else {
      console.log('Could not find the "Цены на завтра" button');
      
      // Take a screenshot anyway to see what's on the page
      const screenshot2Path = path.join(__dirname, 'channex-page-no-button-found.png');
      await page.screenshot({ 
        path: screenshot2Path, 
        fullPage: true 
      });
      
      console.log('Screenshot saved to:', screenshot2Path);
    }
    
  } catch (error) {
    console.error('Error during automation:', error);
    
    // Take error screenshot
    try {
      const errorScreenshotPath = path.join(__dirname, 'channex-error-screenshot.png');
      await page.screenshot({ 
        path: errorScreenshotPath, 
        fullPage: true 
      });
      console.log('Error screenshot saved to:', errorScreenshotPath);
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError);
    }
  }

  // Keep browser open for a moment to see what happened
  console.log('Keeping browser open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('Browser closed. Check the screenshot files in the project directory.');
}

// Run the test
testChannexPage().catch(console.error);