const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outDir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain\\92ac9fbf-7c17-4faa-a0ab-2360e64d6587\\artifacts';
  if (!fs.existsSync(outDir)){
      fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`--- Started Capture for Wizard ---`);

  async function loginAndOpen(page, isMobile) {
    await page.goto('http://localhost:5173/login', { timeout: 30000 });
    await page.evaluate(() => window.localStorage.setItem('cookie_consent', 'true'));
    await page.reload({ waitUntil: 'networkidle' });

    console.log(`Logging in...`);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'test@rentmate.co.il');
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', 'Test!123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    console.log(`Opening Wizard...`);
    // Click FAB
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
       // Check for any button that contains 'הוסף' or has the Plus icon
       const btns = Array.from(document.querySelectorAll('button'));
       // It's the main FAB, it has no text, usually just an svg
       const fab = btns.find(b => b.innerHTML.includes('lucide-plus') || b.querySelector('svg'));
       if (fab) fab.click();
    });
    
    await page.waitForTimeout(1000);

    // Click Add Property (which contains Home icon usually or some specific text)
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addProp = btns.find(b => b.textContent.includes('נכס') || b.innerHTML.includes('lucide-home'));
        if (addProp) addProp.click();
    });

    await page.waitForTimeout(2000);
  }

  // --- Desktop Flow ---
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopContext.newPage();
  await loginAndOpen(desktopPage, false);
  console.log(`[Desktop] Taking Screenshot...`);
  await desktopPage.screenshot({ path: path.join(outDir, `wizard_desktop.png`), fullPage: false });
  await desktopContext.close();

  // --- Mobile Flow ---
  const iPhone = devices['iPhone 12'];
  const mobileContext = await browser.newContext({
    ...iPhone,
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await loginAndOpen(mobilePage, true);
  console.log(`[Mobile] Taking Screenshot...`);
  await mobilePage.screenshot({ path: path.join(outDir, `wizard_mobile.png`), fullPage: false });
  await mobileContext.close();

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
