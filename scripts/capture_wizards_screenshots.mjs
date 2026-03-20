import { chromium, devices } from '@playwright/test';
import fs from 'fs';

(async () => {
    console.log('Starting wizard screenshot capture...');
    
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
        
        console.log('Waiting for login... (max 20s)');
        await page.waitForTimeout(4000); // Give auth time
        try {
             await page.waitForURL('**/dashboard', { timeout: 20000 });
        } catch(e) {
             console.log('Timeout waiting for dashboard URL. Continuing anyway assuming it landed somewhere valid...');
        }
        await page.goto('http://localhost:5173/dashboard');
        await page.waitForTimeout(4000); // let animations & charts settle

        // 2. Open Add Contract Wizard from Dashboard
        console.log('Opening Add Contract Wizard...');
        // Find the Plus button using page.evaluate to find the specific title
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addBtn = btns.find(b => b.title === 'הוסף חדש' || b.title === 'Add New' || b.querySelector('.lucide-plus'));
            if (addBtn) addBtn.click();
        });
        
        await page.waitForTimeout(2000); // Wait for modal to appear
        
        // Find the Add Contract button in the modal
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const contractBtn = btns.find(b => (b.innerText || '').includes('חוזה') || (b.innerText || '').includes('Contract') || b.querySelector('.lucide-file-text'));
            if (contractBtn) contractBtn.click();
        });
        
        await page.waitForTimeout(3000); // wait for wizard animation to slide in

        await page.screenshot({ path: `${dir}/add-contract-wizard.png`, fullPage: false });
        console.log('Captured add-contract-wizard.png');

        // Close wizard (Click X or Cancel, but easier just to reload properties)
        console.log('Navigating to Properties...');
        await page.goto('http://localhost:5173/properties');
        await page.waitForTimeout(4000); 

        // 3. Open Add Property Wizard from Properties List
        console.log('Opening Add Property Wizard...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const propBtn = btns.find(b => b.title === 'הוסף נכס' || b.title === 'Add Property' || b.innerText.includes('נכס') || b.querySelector('.lucide-plus'));
            if (propBtn) propBtn.click();
        });
        await page.waitForTimeout(3000); // wait for wizard animation

        await page.screenshot({ path: `${dir}/add-property-wizard.png`, fullPage: false });
        console.log('Captured add-property-wizard.png');

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
        console.log('Done capturing all screenshots.');
    }
})();
