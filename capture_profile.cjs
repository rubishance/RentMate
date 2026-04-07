const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outDir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain\\92ac9fbf-7c17-4faa-a0ab-2360e64d6587\\artifacts';
  
  if (!fs.existsSync(outDir)){
      fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`--- Started Capture for EditProfileModal ---`);

  async function loginAndOpenProfile(page) {
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

    console.log(`Opening Profile Modal...`);
    // Profile button is usually an avatar or user button. 
    // In our UI, it is often in the header. Let's find it.
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        // Look for the user avatar/button. 
        // It's likely a button with an image or User icon inside it, or text with the initials.
        const btns = Array.from(document.querySelectorAll('button'));
        const profileBtn = btns.find(b => b.innerHTML.includes('lucide-user') || b.querySelector('img[alt*="avatar"]') || b.classList.contains('rounded-full'));
        if (profileBtn) profileBtn.click();
    });
    
    await page.waitForTimeout(1000);

    // After clicking user menu, click "Profile" or "Edit Profile"
    await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('button, a'));
        const editProfileItem = menuItems.find(i => i.textContent.includes('פרופיל') || i.textContent.includes('Profile'));
        if (editProfileItem) editProfileItem.click();
    });

    await page.waitForTimeout(2000);
  }

  // --- Mobile Flow ---
  const iPhone = devices['iPhone 12'];
  const mobileContext = await browser.newContext({
    ...iPhone,
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await loginAndOpenProfile(mobilePage);
  
  console.log(`[Mobile] Taking Screenshot of EditProfileModal...`);
  await mobilePage.screenshot({ path: path.join(outDir, `profile_mobile.png`), fullPage: false });
  await mobileContext.close();

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
