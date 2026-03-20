import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'mobile_screenshots_light');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const pagesToScreenshot = [
  { name: 'landing', url: '/' },
  { name: 'welcome-new', url: '/welcome-new' },
  { name: 'pricing', url: '/pricing' },
  { name: 'login', url: '/login' },
  { name: 'signup', url: '/signup' },
  { name: 'contact', url: '/contact' },
  { name: 'knowledge-base', url: '/knowledge-base' },
  { name: 'cpi-calculator', url: '/tools/cpi-calculator' },
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
  
  // Wait a bit for the local dev server just in case
  console.log("Starting mobile screenshots generation...");

  for (const p of pagesToScreenshot) {
    const page = await context.newPage();
    const targetUrl = BASE_URL + p.url;
    console.log(`Navigating to ${targetUrl}...`);
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      // wait a bit for any animations to settle
      await page.waitForTimeout(10000);
      
      const outPath = path.join(outDir, `${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved screenshot to ${outPath}`);
    } catch (err) {
      console.error(`Failed to screenshot ${p.name}:`, err);
    }
    await page.close();
  }

  await browser.close();
  console.log("Done.");
}

run().catch(console.error);
