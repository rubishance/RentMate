import { chromium, devices } from '@playwright/test';
import fs from 'fs';

(async () => {
    console.log('Starting bulk screenshot capture for support materials...');
    
    // Setup mobile viewport (iPhone 13 dimensions)
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        ...devices['iPhone 13'],
        locale: 'he-IL', 
        colorScheme: 'light'
    });
    const page = await context.newPage();

    // Ensure directory exists
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
        
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('Logged in successfully!');
        await page.waitForTimeout(3000); // let animations & charts settle

        // Capture Dashboard
        await page.screenshot({ path: `${dir}/dashboard-guide.png`, fullPage: false });
        console.log('Captured dashboard-guide.png');

        // Capture Properties List
        console.log('Navigating to Properties...');
        await page.goto('http://localhost:5173/properties');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/properties-guide.png`, fullPage: false });
        console.log('Captured properties-guide.png');

        // Capture Contracts
        console.log('Navigating to Contracts...');
        await page.goto('http://localhost:5173/contracts');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/new-contract-guide.png`, fullPage: false });
        console.log('Captured new-contract-guide.png');

        // Capture Calculator
        console.log('Navigating to Tools/Calculator...');
        await page.goto('http://localhost:5173/tools');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/cpi-calculator-guide.png`, fullPage: false });
        console.log('Captured cpi-calculator-guide.png');

        // Capture Tenants
        console.log('Navigating to Tenants...');
        await page.goto('http://localhost:5173/tenants');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/tenants-guide.png`, fullPage: false });
        console.log('Captured tenants-guide.png');

        // Capture Maintenance
        console.log('Navigating to Maintenance...');
        await page.goto('http://localhost:5173/maintenance');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/maintenance-guide.png`, fullPage: false });
        console.log('Captured maintenance-guide.png');

        // Capture Settings
        console.log('Navigating to Settings...');
        await page.goto('http://localhost:5173/settings');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/settings-guide.png`, fullPage: false });
        console.log('Captured settings-guide.png');

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
        console.log('Done capturing all screenshots.');
    }
})();
