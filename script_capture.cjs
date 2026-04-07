const { chromium, devices } = require('playwright');
const path = require('path');

const targetPage = process.argv[2] || 'dashboard';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outDir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain\\92ac9fbf-7c17-4faa-a0ab-2360e64d6587\\artifacts';

  console.log(`--- Started Capture for /${targetPage} ---`);

  // --- Desktop Flow ---
  console.log(`[Desktop] Navigating to login...`);
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopContext.newPage();
  
  await desktopPage.goto('http://localhost:5173/login', { timeout: 30000 });
  await desktopPage.evaluate(() => window.localStorage.setItem('cookie_consent', 'true'));
  await desktopPage.reload({ waitUntil: 'networkidle' });

  console.log('[Desktop] Logging in...');
  await desktopPage.waitForSelector('input[type="email"]');
  await desktopPage.fill('input[type="email"]', 'test@rentmate.co.il');
  await desktopPage.waitForSelector('input[type="password"]');
  await desktopPage.fill('input[type="password"]', 'Test!123');
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL('**/dashboard', { timeout: 30000 });

  console.log(`[Desktop] Navigating to /${targetPage}...`);
  await desktopPage.goto(`http://localhost:5173/${targetPage}`);
  await desktopPage.waitForTimeout(8000);
  console.log('Current URL: ', desktopPage.url());

  console.log(`[Desktop] Taking Screenshot...`);
  await desktopPage.screenshot({ path: path.join(outDir, `${targetPage}_desktop.png`), fullPage: true });
  await desktopContext.close();

  // --- Mobile Flow ---
  console.log(`[Mobile] Starting Emulation (iPhone)...`);
  const iPhone = devices['iPhone 12'];
  const mobileContext = await browser.newContext({
    ...iPhone,
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();

  console.log(`[Mobile] Navigating to login...`);
  await mobilePage.goto('http://localhost:5173/login', { timeout: 30000 });
  await mobilePage.evaluate(() => window.localStorage.setItem('cookie_consent', 'true'));
  await mobilePage.reload({ waitUntil: 'networkidle' });

  console.log(`[Mobile] Logging in...`);
  await mobilePage.waitForSelector('input[type="email"]');
  await mobilePage.fill('input[type="email"]', 'test@rentmate.co.il');
  await mobilePage.waitForSelector('input[type="password"]');
  await mobilePage.fill('input[type="password"]', 'Test!123');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('**/dashboard', { timeout: 30000 });

  console.log(`[Mobile] Navigating to /${targetPage}...`);
  await mobilePage.goto(`http://localhost:5173/${targetPage}`);
  await mobilePage.waitForTimeout(8000); // render buffer
  console.log('Mobile URL: ', mobilePage.url());

  console.log(`[Mobile] Taking Screenshot...`);
  await mobilePage.screenshot({ path: path.join(outDir, `${targetPage}_mobile.png`), fullPage: true });
  await mobileContext.close();

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
