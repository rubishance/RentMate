import { chromium, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTest() {
  console.log('Starting Protocol Wizard Upload Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@rentmate.co.il');
    await page.fill('input[type="password"]', 'Test!123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('Logged in successfully.');

    // 2. Go to Properties
    console.log('Navigating to properties...');
    await page.goto('http://localhost:5173/properties');
    await page.waitForLoadState('networkidle');

    // 3. Open first property
    console.log('Opening first property...');
    const firstProperty = page.locator('.group').first();
    await firstProperty.click();
    await page.waitForURL('**/properties/**');
    await page.waitForLoadState('networkidle');

    // 4. Open Protocol Wizard
    console.log('Opening Protocol Wizard...');
    await page.click('button:has-text("Generate Protocol"), button:has-text("הפק פרוטוקול")');
    await page.waitForSelector('text="Create Handover Protocol", text="יצירת פרוטוקול מסירה"');
    
    // 5. Fill mandatory fields (Tenant Name, ID)
    await page.fill('input[placeholder="Full Name"], input[placeholder="שם מלא"]', 'Test Tenant');
    await page.fill('input[placeholder="ID Number"], input[placeholder="תעודת זהות"]', '123456789');
    
    // 6. Go to next step (Utilities)
    await page.click('button:has-text("Next"), button:has-text("הבא")');
    await page.waitForSelector('text="Utility Meters", text="מוני צריכה"');

    // 7. Upload image to the first utility meter
    console.log('Uploading image...');
    const fileChooserPromise = page.waitForEvent('filechooser');
    // First camera icon
    await page.locator('label[for^="util-photo-"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('public/ui_examples/modern_dashboard.png'); // Just use any existing image in the repo
    
    // 8. Wait for upload to complete and SecureImage to appear
    console.log('Waiting for image to appear...');
    await page.waitForSelector('img[alt="Meter evidence"]', { state: 'visible', timeout: 15000 });
    
    // Wait for the SecureImage to load (animate-pulse should disappear)
    await page.waitForTimeout(2000); 

    // 9. Take screenshot
    await page.screenshot({ path: 'protocol_wizard_upload_success.png' });
    console.log('✅ Test Passed! Image uploaded and displayed. Screenshot saved as protocol_wizard_upload_success.png');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    await page.screenshot({ path: 'protocol_wizard_upload_error.png' });
  } finally {
    await browser.close();
  }
}

runTest();
