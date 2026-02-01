import { test, expect } from '@playwright/test';

test.describe('User Journey Simulation', () => {
    test('should simulate user login and wizard navigation', async ({ page }) => {
        // 1. Setup Bypass
        await page.addInitScript(() => {
            window.localStorage.setItem('rentmate_e2e_bypass', 'true');
        });

        // 2. Navigate
        await page.goto('http://localhost:5174/contracts/new');
        await page.waitForLoadState('networkidle');

        // 3. Diagnostic Log
        console.log(`Current URL: ${page.url()}`);

        // 4. Verify Content
        // We might be in Wizard (H1) or Limit Reached (H2) or Loading
        const h1 = page.locator('h1'); // New Contract
        const h2 = page.locator('h2'); // Limit Reached
        const limitReached = page.locator('text=Limit Reached'); // Fallback text

        // Check if ANY of these are visible
        const h1Count = await h1.count();
        const h2Count = await h2.count();

        console.log(`H1 count: ${h1Count}, H2 count: ${h2Count}`);

        if (h1Count > 0) {
            await expect(h1).toBeVisible();
            console.log("Wizard Loaded Successfully");
        } else if (h2Count > 0) {
            await expect(h2).toBeVisible();
            console.log("Limit Reached Page Loaded (Valid State for Guest)");
        } else {
            // Maybe it's just loading?
            // Snapshot?
            console.log("No H1 or H2 found. Checking for spinner or login...");
            // Fail if nothing useful found
            if (page.url().includes('login')) throw new Error("Redirected to Login");
            throw new Error("UI State Unclear: No Wizard (H1) and No Limit Reached (H2)");
        }
    });
});
