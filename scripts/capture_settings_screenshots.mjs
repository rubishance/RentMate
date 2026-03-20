import { chromium, devices } from '@playwright/test';
import fs from 'fs';

(async () => {
    console.log('Starting settings screenshots capture...');
    
    // Setup mobile viewport (iPhone 13 dimensions)
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        ...devices['iPhone 13'],
        locale: 'he-IL', 
        colorScheme: 'light'
    });
    const page = await context.newPage();

    const dir = 'public/images/support';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        // 1. Login
        console.log('Logging in...');
        await page.goto('http://localhost:5173/login');
        await page.fill('input[type="email"]', 'test@rentmate.co.il');
        await page.fill('input[type="password"]', 'Test!123');
        await page.click('button[type="submit"]');
        
        console.log('Waiting for login... (max 20s)');
        await page.waitForTimeout(4000); // Give auth time
        try {
             await page.waitForURL('**/dashboard', { timeout: 20000 });
        } catch(e) {
             console.log('Timeout waiting for dashboard URL. Continuing anyway...');
        }
        
        // Navigate to settings directly
        await page.goto('http://localhost:5173/settings');
        await page.waitForTimeout(4000); // Wait for page to settle

        console.log('Capturing Profile Modal...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div'));
            const btn = btns.find(b => b.innerText && (b.innerText.trim() === 'פרופיל' || b.innerText.trim() === 'Profile'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/settings-profile.png`, fullPage: false });
        console.log('Saved settings-profile.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        console.log('Capturing Notifications Modal...');
        // Sometimes clicking the div doesn't trigger if we find the wrong element, let's look for the text
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div'));
            const btn = btns.find(b => b.innerText && (b.innerText.trim() === 'התראות' || b.innerText.trim() === 'Notifications'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/settings-notifications.png`, fullPage: false });
        console.log('Saved settings-notifications.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('Capturing Privacy & Security Modal...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div'));
            const btn = btns.find(b => b.innerText && (b.innerText.trim() === 'פרטיות ואבטחה' || b.innerText.trim() === 'Privacy & Security'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/settings-privacy-security.png`, fullPage: false });
        console.log('Saved settings-privacy-security.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('Capturing Accessibility Options Modal...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div'));
            const btn = btns.find(b => b.innerText && (b.innerText.trim() === 'אפשרויות נגישות' || b.innerText.trim() === 'Accessibility Options'));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/settings-accessibility.png`, fullPage: false });
        console.log('Saved settings-accessibility.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
        console.log('Done capturing all screenshots.');
    }
})();
