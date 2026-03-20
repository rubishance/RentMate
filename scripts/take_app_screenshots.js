import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'mobile_screenshots_app_light');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const authenticatedPages = [
  { name: 'dashboard', url: '/dashboard' },
  { name: 'properties', url: '/properties' },
  { name: 'maintenance', url: '/maintenance' },
  { name: 'documents', url: '/documents' },
  { name: 'calculator', url: '/calculator' },
  { name: 'settings', url: '/settings' },
  { name: 'tools', url: '/tools' },
  { name: 'payments', url: '/payments' },
];

const BASE_URL = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 13'];
  
  const context = await browser.newContext({
    ...iPhone,
    colorScheme: 'light',
  });
  
  // Inject cookie consent
  await context.addInitScript(() => {
    window.localStorage.setItem('cookie_consent', 'true');
  });
  
  console.log("Starting authenticated mobile screenshots generation...");

  const page = await context.newPage();
  
  console.log("Navigating to login...");
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
  
  try {
    // Fill in credentials if the inputs exist
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@rentmate.co.il');
    }
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('Test!123');
    }
    
    // Click submit
    console.log("Submitting login form...");
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log("Successfully logged in.");
    // Wait an extra moment to let the dashboard fully load and settle
    await page.waitForTimeout(3000);
  } catch (err) {
    console.log("Login failed or timed out. If you are not in demo mode, you might need real credentials.");
    console.error(err);
    await browser.close();
    return;
  }

  // Now capture each authenticated page
  for (const p of authenticatedPages) {
    const targetUrl = BASE_URL + p.url;
    console.log(`Navigating to ${targetUrl}...`);
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      // wait a bit for any animations/data fetching to settle
      await page.waitForTimeout(10000);
      
      const outPath = path.join(outDir, `${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved screenshot to ${outPath}`);
    } catch (err) {
      console.error(`Failed to screenshot ${p.name}:`, err);
    }
  }

  await browser.close();
  console.log("Done.");
}

run().catch(console.error);
