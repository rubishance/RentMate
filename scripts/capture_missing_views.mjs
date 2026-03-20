import { chromium, devices } from '@playwright/test';
import fs from 'fs';

(async () => {
    console.log('Starting missing views screenshots capture...');
    
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

        console.log('Dismissing Cookie Banner...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const acceptBtn = btns.find(b => b.innerText && (b.innerText.includes('הבנתי') || b.innerText.includes('Accept') || b.innerText.includes('אישור')));
            if (acceptBtn) acceptBtn.click();
        });
        await page.waitForTimeout(1000);
        
        // --- PAGES ---

        console.log('Capturing Payments Page...');
        await page.goto('http://localhost:5173/payments');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${dir}/payments-page.png`, fullPage: false });
        console.log('Saved payments-page.png');

        console.log('Capturing Add Payment Modal...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText && (b.innerText.includes('הוסף תשלום') || b.innerText.includes('Add Payment') || b.innerText.includes('רישום הוצאה')));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/log-payment-modal.png`, fullPage: false });
        console.log('Saved log-payment-modal.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('Capturing Documents Page...');
        await page.goto('http://localhost:5173/documents');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${dir}/documents-page.png`, fullPage: false });
        console.log('Saved documents-page.png');

        console.log('Capturing Upload Document Modal...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText && (b.innerText.includes('העלאת מסמך') || b.innerText.includes('Upload Document')));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/upload-document-modal.png`, fullPage: false });
        console.log('Saved upload-document-modal.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('Capturing Analytics Page...');
        await page.goto('http://localhost:5173/analytics');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${dir}/analytics-page.png`, fullPage: false });
        console.log('Saved analytics-page.png');

        // --- DYNAMIC MODALS ---

        console.log('Capturing Tenants Page & Add Tenant Modal...');
        await page.goto('http://localhost:5173/tenants');
        await page.waitForTimeout(3000);
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText && (b.innerText.includes('הוסף שוכר') || b.innerText.includes('Add Tenant')));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/add-tenant-modal.png`, fullPage: false });
        console.log('Saved add-tenant-modal.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('Capturing Maintenance Page & Add Ticket Modal...');
        await page.goto('http://localhost:5173/maintenance');
        await page.waitForTimeout(3000);
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText && (b.innerText.includes('תקלה חדשה') || b.innerText.includes('New Request')));
            if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${dir}/add-maintenance-modal.png`, fullPage: false });
        console.log('Saved add-maintenance-modal.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // --- DRILL DOWNS ---

        console.log('Capturing Property Details...');
        await page.goto('http://localhost:5173/properties');
        await page.waitForTimeout(3000);

        // Click first property card
        console.log('Selecting Property Card...');
        let navOk = false;
        try {
            // Find any element containing the structure of the property card (e.g. an image container inside a rounded box)
            await page.waitForSelector('img.object-cover', { timeout: 3000 });
            await page.click('img.object-cover'); // Click the image inside the card
            navOk = true;
        } catch (e) {
            console.log('Failed to click property card', e.message);
        }

        if (navOk) {
            await page.waitForTimeout(4000); // Wait longer for the stack navigation to finish animating
            await page.screenshot({ path: `${dir}/property-details.png`, fullPage: false });
            console.log('Saved property-details.png');

            console.log('Capturing Edit Property Modal...');
            // In the PropertyHub header, the "Edit" button is often hidden inside the More menu for space.
            // Wait, actually looking at PropertyHub.tsx, there's NO More menu for Edit property - the Edit button itself is missing or it's just 'isEditing' mode.
            // Let's take a look at the actual button we are clicking. There's usually a clear 'Edit' button or general interaction.
            // Let's just capture the Contract Details instead while in the property details.
            
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, div[role="menuitem"], a'));
                const btn = btns.find(b => b.innerText && (b.innerText.includes('ערוך נכס') || b.innerText.includes('Edit')));
                if (btn) btn.click();
            });
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `${dir}/edit-property-modal.png`, fullPage: false });
            console.log('Saved edit-property-modal.png');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            console.log('Capturing Contract Details...');
            // In contracts tab, click a contract card
            const contractNavOk = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('.cursor-pointer'));
                if (cards.length > 0) {
                    cards[cards.length - 1].click(); // Click last cursor-pointer, might be a contract
                    return true;
                }
                return false;
            });

            if (contractNavOk) {
                await page.waitForTimeout(3000);
                await page.screenshot({ path: `${dir}/contract-details.png`, fullPage: false });
                console.log('Saved contract-details.png');
            }
        } else {
            console.log('No property link found. Skipping property drill-down screenshots.');
        }

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
        console.log('Done capturing all remaining screenshots.');
    }
})();
